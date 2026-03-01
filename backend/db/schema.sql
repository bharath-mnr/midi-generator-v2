-- MidiGenerator SQLite schema

-- Stores every generated composition
CREATE TABLE IF NOT EXISTS history (
  id          INTEGER  PRIMARY KEY AUTOINCREMENT,
  prompt      TEXT     NOT NULL,
  midi_path   TEXT     NOT NULL,
  json_data   TEXT,
  tempo       INTEGER  DEFAULT 120,
  key         TEXT     DEFAULT 'C',
  bars        INTEGER  DEFAULT 0,
  created_at  DATETIME DEFAULT (datetime('now'))
);

-- Tracks what is indexed in Pinecone
CREATE TABLE IF NOT EXISTS knowledge (
  id          INTEGER  PRIMARY KEY AUTOINCREMENT,
  source_file TEXT     NOT NULL,
  chunk_id    TEXT     NOT NULL UNIQUE,
  chunk_type  TEXT     NOT NULL,  -- 'metadata' | 'harmony' | 'voice' | 'structure' | 'doc'
  summary     TEXT,
  created_at  DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_knowledge_source ON knowledge(source_file);
CREATE INDEX IF NOT EXISTS idx_history_created  ON history(created_at DESC);
