-- Require URL-control proof before a source can enter paid research.
ALTER TABLE public.sources
  ADD COLUMN IF NOT EXISTS ownership_status TEXT NOT NULL DEFAULT 'unverified';

ALTER TABLE public.sources
  ADD COLUMN IF NOT EXISTS ownership_proof_type TEXT;

ALTER TABLE public.sources
  ADD COLUMN IF NOT EXISTS verified_owner_wallet TEXT;

ALTER TABLE public.sources
  ADD COLUMN IF NOT EXISTS ownership_verified_at TIMESTAMPTZ;

ALTER TABLE public.sources
  ADD COLUMN IF NOT EXISTS canonicalization_version TEXT;

DROP POLICY IF EXISTS "Users can insert sources" ON public.sources;
DROP POLICY IF EXISTS "Authenticated users can insert source chunks" ON public.source_chunks;
DROP POLICY IF EXISTS "Authenticated users can delete source chunks" ON public.source_chunks;

CREATE INDEX IF NOT EXISTS sources_verified_research_idx
  ON public.sources (status, ownership_status)
  WHERE status = 'extracted' AND ownership_status = 'verified';
