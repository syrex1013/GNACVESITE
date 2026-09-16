-- GNA-115 disclosure site schema.

CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  reference_year INTEGER NOT NULL,
  reference_seq INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'queued', 'rejected', 'published')),
  title TEXT NOT NULL,
  vulnerability_type TEXT NOT NULL,
  vendor TEXT NOT NULL,
  product TEXT NOT NULL,
  affected_versions TEXT NOT NULL,
  cve_id TEXT,
  cwe_ids TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'none')),
  cvss_score REAL,
  cvss_vector TEXT,
  description TEXT NOT NULL,
  technical_details TEXT,
  poc TEXT,
  references_json TEXT NOT NULL DEFAULT '[]',
  reporter_name TEXT NOT NULL,
  reporter_email TEXT,
  reporter_org TEXT,
  reporter_note TEXT,
  ip_hash TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (reference_year, reference_seq)
);

CREATE INDEX idx_submissions_status ON submissions (status, created_at DESC);

CREATE TABLE gcves (
  id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  seq INTEGER NOT NULL,
  submission_id TEXT NOT NULL UNIQUE REFERENCES submissions (id),
  cve_ref TEXT,
  record_json TEXT NOT NULL,
  published_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (year, seq)
);

CREATE INDEX idx_gcves_yseq ON gcves (year DESC, seq DESC);
CREATE INDEX idx_gcves_cveref ON gcves (cve_ref);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE rate_limits (
  key TEXT NOT NULL,
  window_start TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);
