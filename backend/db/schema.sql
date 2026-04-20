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

-- Tracks what is indexed in Pinecone (analytical chunks)
CREATE TABLE IF NOT EXISTS knowledge (
  id          INTEGER  PRIMARY KEY AUTOINCREMENT,
  source_file TEXT     NOT NULL,
  chunk_id    TEXT     NOT NULL UNIQUE,
  chunk_type  TEXT     NOT NULL,  -- 'exact_ref' | 'blueprint' | 'patterns_rh' | 'patterns_lh' | 'structure' | 'harmony' | 'style' | 'doc'
  summary     TEXT,
  created_at  DATETIME DEFAULT (datetime('now'))
);

-- Stores the EXACT original JSON for every uploaded MIDI/JSON file
-- Used for precise track retrieval ("give me exact gibran alcocer idea 10")
-- NOT stored in Pinecone (too large) — queried directly from here
CREATE TABLE IF NOT EXISTS tracks (
  id          INTEGER  PRIMARY KEY AUTOINCREMENT,
  source_file TEXT     NOT NULL UNIQUE,
  json_data   TEXT     NOT NULL,   -- full original JSON string, untouched
  key         TEXT,
  tempo       INTEGER,
  bars        INTEGER,
  created_at  DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_knowledge_source ON knowledge(source_file);
CREATE INDEX IF NOT EXISTS idx_history_created  ON history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_source    ON tracks(source_file);