-- v1 schema. portal.sqlite is rebuilt from the seed when SEED_VERSION changes.
-- Later seasons are more player rows (portal_year is not fixed to 2026).
-- New stat keys do not need a migration: player_stats is one row per figure.
-- nil_reports and campus_visits are intentionally empty until a source is cited.

CREATE TABLE schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE sources (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  publisher TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  published_on TEXT,
  accessed_on TEXT NOT NULL,
  stats_scope TEXT NOT NULL CHECK (stats_scope IN ('table', 'bios')),
  coverage_note TEXT NOT NULL
);

CREATE TABLE players (
  id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  position_raw TEXT NOT NULL,
  position_group TEXT NOT NULL CHECK (
    position_group IN ('QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'K', 'P', 'LS', 'ATH')
  ),
  height_inches INTEGER CHECK (height_inches IS NULL OR height_inches BETWEEN 60 AND 90),
  weight_lbs INTEGER CHECK (weight_lbs IS NULL OR weight_lbs BETWEEN 140 AND 450),
  portal_year INTEGER NOT NULL,
  portal_entry_date TEXT,
  signed_on TEXT,
  school_from TEXT,
  school_to TEXT,
  eligibility_raw TEXT,
  hometown TEXT,
  prep_listed TEXT,
  data_note TEXT,
  context_note TEXT,
  source_id INTEGER NOT NULL REFERENCES sources(id),
  UNIQUE (full_name, school_to, portal_year)
);

CREATE TABLE player_name_variants (
  id INTEGER PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  variant TEXT NOT NULL,
  note TEXT NOT NULL
);

CREATE TABLE player_stats (
  id INTEGER PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  season_label TEXT NOT NULL,
  season_sort INTEGER NOT NULL,
  stat_key TEXT NOT NULL,
  label TEXT NOT NULL,
  value_num REAL,
  value_text TEXT,
  unit TEXT,
  sort_order INTEGER NOT NULL,
  CHECK (value_num IS NOT NULL OR value_text IS NOT NULL),
  UNIQUE (player_id, season_label, stat_key)
);

CREATE TABLE nil_reports (
  id INTEGER PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  season_year INTEGER,
  amount_usd INTEGER,
  reported_on TEXT,
  source_url TEXT,
  notes TEXT
);

CREATE TABLE campus_visits (
  id INTEGER PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  school TEXT NOT NULL,
  visited_on TEXT,
  visit_type TEXT,
  source_url TEXT,
  notes TEXT
);

CREATE INDEX idx_players_group_year ON players (position_group, portal_year);
CREATE INDEX idx_players_name ON players (full_name);
CREATE INDEX idx_stats_player ON player_stats (player_id);
