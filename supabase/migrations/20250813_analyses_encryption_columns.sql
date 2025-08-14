-- Safely add encryption-related columns if they do not exist
ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS encrypted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS iv text,
  ADD COLUMN IF NOT EXISTS ciphertext text,
  ADD COLUMN IF NOT EXISTS alg text;

-- (optional) keep a short plaintext summary
ALTER TABLE analyses
  ADD COLUMN IF NOT EXISTS summary_tldr text;

-- (optional) index for user/time queries
CREATE INDEX IF NOT EXISTS idx_analyses_user_created_at
  ON analyses (user_id, created_at DESC);


