CREATE TABLE IF NOT EXISTS guild_config (
  guild_id   TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  genres     TEXT NOT NULL DEFAULT '[]',
  lat        REAL NOT NULL,
  lng        REAL NOT NULL,
  radius_km  INTEGER NOT NULL DEFAULT 80,
  place      TEXT NOT NULL DEFAULT '',
  digest_day INTEGER NOT NULL DEFAULT 1,
  seeded     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS watchlist (
  guild_id TEXT NOT NULL,
  artist   TEXT NOT NULL,
  PRIMARY KEY (guild_id, artist)
);

CREATE TABLE IF NOT EXISTS seen_shows (
  guild_id   TEXT NOT NULL,
  dedupe_key TEXT NOT NULL,
  posted_at  INTEGER NOT NULL,
  PRIMARY KEY (guild_id, dedupe_key)
);
