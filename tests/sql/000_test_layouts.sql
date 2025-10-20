-- Minimal test layouts table for FEAT-002 tests
-- Only includes columns needed for tier middleware free-limit checks
-- This table is created in Jest global setup before integration tests run

CREATE TABLE IF NOT EXISTS layouts (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  deleted_at  TIMESTAMP NULL
);

-- Index for free-limit count query: SELECT count(id) FROM layouts WHERE user_id = $1 AND deleted_at IS NULL
CREATE INDEX IF NOT EXISTS idx_layouts_user_id_deleted_at ON layouts(user_id, deleted_at);
