-- Settings table for runtime configuration.
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed default lock state (unlocked).
INSERT OR IGNORE INTO settings (key, value) VALUES ('submissions_locked', '0');
