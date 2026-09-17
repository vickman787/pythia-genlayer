-- Bind settlements to the exact GenLayer decision and evidence manifest used.
ALTER TABLE public.research_sessions
  ADD COLUMN IF NOT EXISTS consensus_receipt JSONB;

ALTER TABLE public.research_sessions
  ADD COLUMN IF NOT EXISTS consensus_tx_hash TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS research_sessions_consensus_tx_hash_idx
  ON public.research_sessions (consensus_tx_hash)
  WHERE consensus_tx_hash IS NOT NULL;
