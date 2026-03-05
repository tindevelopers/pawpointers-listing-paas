-- ===================================
-- DataForSEO task tracking on sources
-- ===================================
-- Minimal plumbing to support task_post + task_get without full ingestion_jobs tables.

ALTER TABLE public.external_review_sources
  ADD COLUMN IF NOT EXISTS last_task_id text;

ALTER TABLE public.external_review_sources
  ADD COLUMN IF NOT EXISTS last_task_submitted_at timestamptz;

ALTER TABLE public.external_review_sources
  ADD COLUMN IF NOT EXISTS next_poll_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_external_review_sources_poll
  ON public.external_review_sources(provider, enabled, next_poll_at)
  WHERE provider = 'dataforseo' AND enabled = true;

