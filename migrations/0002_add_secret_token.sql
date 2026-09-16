-- Add secret token for submitter status lookup. SQLite cannot add a UNIQUE
-- column directly, so create the column plainly and enforce uniqueness via an
-- explicit unique index.
ALTER TABLE submissions ADD COLUMN secret_token TEXT;
CREATE UNIQUE INDEX idx_submissions_secret ON submissions (secret_token) WHERE secret_token IS NOT NULL;
