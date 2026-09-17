-- Performance: keep retrieval and settlement lookups inside Postgres.
--
-- Before this migration, every research request fetched all verified sources
-- with every source_chunks.embedding (vector(1536), roughly 6KB per chunk) and
-- ranked them in Node. That made a single request read the entire vector
-- corpus from disk, which is what exhausted the Supabase Disk IO Budget.
--
-- These indexes plus match_research_sources() keep the nearest-neighbour
-- search in the database and return only the surviving chunk text.

set search_path = public, extensions;

-- Join and filter indexes. Foreign keys are not indexed automatically, so the
-- sources -> source_chunks join was scanning the largest table each time.
create index if not exists source_chunks_source_id_idx
  on public.source_chunks (source_id);

create index if not exists sources_research_lookup_idx
  on public.sources (status, ownership_status, price_usdc);

create index if not exists sources_creator_id_idx
  on public.sources (creator_id);

-- Public stats read every settled amount on each page render; INCLUDE makes
-- that an index-only scan instead of a heap fetch per row.
create index if not exists payment_authorizations_status_idx
  on public.payment_authorizations (status) include (amount_usdc);

create index if not exists payment_authorizations_session_id_idx
  on public.payment_authorizations (session_id);

create index if not exists payment_settlements_authorization_idx
  on public.payment_settlements (authorization_id);

create index if not exists citation_decisions_session_id_idx
  on public.citation_decisions (session_id);

create index if not exists research_sessions_status_idx
  on public.research_sessions (status);

create index if not exists research_sessions_user_created_idx
  on public.research_sessions (user_id, created_at desc);

-- Approximate nearest-neighbour index for the embedding column. Wrapped in a
-- DO block so an unexpected pgvector build failure cannot roll back the
-- indexes above; the search function still works without it, just slower.
do $$
begin
  execute 'create index if not exists source_chunks_embedding_hnsw_idx
             on public.source_chunks using hnsw (embedding vector_cosine_ops)';
  raise notice 'source_chunks_embedding_hnsw_idx ready';
exception when others then
  raise notice 'skipped hnsw index: % (%)', sqlerrm, sqlstate;
end
$$;

analyze public.source_chunks;
analyze public.sources;
analyze public.payment_authorizations;

-- Nearest-neighbour retrieval plus the same per-source top-N grouping the
-- application used to do in JS. Returns only chunk text, never embeddings.
create or replace function public.match_research_sources(
  p_query_embedding text,
  p_max_price numeric,
  p_chunk_pool int default 40,
  p_chunks_per_source int default 2,
  p_max_sources int default 2
)
returns table (
  source_id uuid,
  title text,
  url text,
  price_usdc numeric,
  content_hash text,
  creator_id uuid,
  canonicalization_version text,
  wallet_address text,
  chunk_text text,
  score double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with nearest as (
    select
      sc.source_id,
      sc.chunk_text,
      sc.embedding <=> (p_query_embedding::vector(1536)) as distance
    from public.source_chunks sc
    where sc.embedding is not null
    order by sc.embedding <=> (p_query_embedding::vector(1536))
    limit greatest(p_chunk_pool, 1)
  ),
  eligible as (
    select
      s.id as source_id,
      s.title,
      s.url,
      s.price_usdc,
      s.content_hash,
      s.creator_id,
      s.canonicalization_version,
      p.wallet_address,
      n.chunk_text,
      (1 - n.distance) as score,
      n.distance
    from nearest n
    join public.sources s on s.id = n.source_id
    left join public.creator_profiles cp on cp.id = s.creator_id
    left join public.profiles p on p.id = cp.user_id
    where s.status = 'extracted'
      and s.ownership_status = 'verified'
      and s.price_usdc <= p_max_price
  ),
  ranked as (
    select
      e.*,
      row_number() over (partition by e.source_id order by e.distance) as chunk_rank,
      min(e.distance) over (partition by e.source_id) as best_distance
    from eligible e
  ),
  top_sources as (
    select r.source_id
    from ranked r
    group by r.source_id
    order by min(r.best_distance)
    limit greatest(p_max_sources, 1)
  )
  select
    r.source_id,
    r.title,
    r.url,
    r.price_usdc,
    r.content_hash,
    r.creator_id,
    r.canonicalization_version,
    r.wallet_address,
    r.chunk_text,
    r.score
  from ranked r
  join top_sources t on t.source_id = r.source_id
  where r.chunk_rank <= greatest(p_chunks_per_source, 1)
  order by r.best_distance, r.source_id, r.chunk_rank;
$$;

revoke all on function public.match_research_sources(text, numeric, int, int, int) from public, anon, authenticated;
grant execute on function public.match_research_sources(text, numeric, int, int, int) to service_role;
