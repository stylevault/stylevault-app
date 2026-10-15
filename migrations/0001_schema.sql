-- StyleVault core schema

-- ── Reference data ──────────────────────────────────────────────────────────
CREATE TABLE countries (
  code      TEXT PRIMARY KEY,           -- ISO 3166-1 alpha-2
  name      TEXT NOT NULL,
  slug      TEXT NOT NULL UNIQUE,
  region    TEXT NOT NULL,              -- North | West | Central | East | Southern
  capital   TEXT
);

CREATE TABLE topics (
  slug      TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  color     TEXT,
  sort      INTEGER NOT NULL DEFAULT 0
);

-- ── Sources & collection health ────────────────────────────────────────────
CREATE TABLE sources (
  id                   INTEGER PRIMARY KEY,
  slug                 TEXT NOT NULL UNIQUE,
  name                 TEXT NOT NULL,
  homepage             TEXT NOT NULL,
  feed_url             TEXT NOT NULL UNIQUE,
  country_code         TEXT REFERENCES countries(code),   -- NULL = pan-African
  language             TEXT NOT NULL DEFAULT 'en',
  active               INTEGER NOT NULL DEFAULT 1,
  permission_status    TEXT NOT NULL DEFAULT 'unreviewed'
                       CHECK (permission_status IN ('unreviewed', 'permitted', 'restricted', 'denied')),
  permission_notes     TEXT,
  check_interval_min   INTEGER NOT NULL DEFAULT 60,
  next_check_at        INTEGER NOT NULL DEFAULT 0,       -- unix seconds
  last_checked_at      INTEGER,
  last_success_at      INTEGER,
  last_error           TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  etag                 TEXT,
  last_modified        TEXT,
  total_articles       INTEGER NOT NULL DEFAULT 0,
  created_at           INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_sources_due ON sources(active, next_check_at);

CREATE TABLE collection_runs (
  id              INTEGER PRIMARY KEY,
  started_at      INTEGER NOT NULL,
  finished_at     INTEGER,
  trigger         TEXT NOT NULL,         -- cron | manual
  sources_checked INTEGER NOT NULL DEFAULT 0,
  items_seen      INTEGER NOT NULL DEFAULT 0,
  articles_added  INTEGER NOT NULL DEFAULT 0,
  errors          INTEGER NOT NULL DEFAULT 0,
  notes           TEXT
);

-- ── Articles (metadata only, never full text) ──────────────────────────────
CREATE TABLE articles (
  id              INTEGER PRIMARY KEY,
  source_id       INTEGER NOT NULL REFERENCES sources(id),
  url             TEXT NOT NULL,
  url_hash        TEXT NOT NULL UNIQUE,  -- sha-256 of the normalised URL
  title           TEXT NOT NULL,
  summary         TEXT,                  -- short publisher-supplied teaser, max ~300 chars
  image_url       TEXT,
  language        TEXT,
  published_at    INTEGER NOT NULL,
  fetched_at      INTEGER NOT NULL,
  primary_country TEXT,
  cluster_id      INTEGER,               -- id of the first article reporting the same story
  is_duplicate    INTEGER NOT NULL DEFAULT 0  -- near-identical copy of another article
);
CREATE INDEX idx_articles_feed    ON articles(is_duplicate, published_at DESC);
CREATE INDEX idx_articles_cluster ON articles(cluster_id, published_at);
CREATE INDEX idx_articles_source  ON articles(source_id, published_at DESC);

CREATE TABLE article_countries (
  country_code TEXT NOT NULL,
  article_id   INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  score        INTEGER NOT NULL,
  PRIMARY KEY (country_code, article_id)
) WITHOUT ROWID;
CREATE INDEX idx_article_countries_article ON article_countries(article_id);

CREATE TABLE article_topics (
  topic_slug TEXT NOT NULL,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  score      INTEGER NOT NULL,
  PRIMARY KEY (topic_slug, article_id)
) WITHOUT ROWID;
CREATE INDEX idx_article_topics_article ON article_topics(article_id);

-- Full-text search over headlines and teasers
CREATE VIRTUAL TABLE articles_fts USING fts5(
  title, summary,
  content = 'articles', content_rowid = 'id',
  tokenize = 'unicode61 remove_diacritics 2'
);
CREATE TRIGGER articles_ai AFTER INSERT ON articles BEGIN
  INSERT INTO articles_fts(rowid, title, summary) VALUES (new.id, new.title, new.summary);
END;
CREATE TRIGGER articles_ad AFTER DELETE ON articles BEGIN
  INSERT INTO articles_fts(articles_fts, rowid, title, summary) VALUES ('delete', old.id, old.title, old.summary);
END;

-- ── Accounts ───────────────────────────────────────────────────────────────
CREATE TABLE users (
  id            INTEGER PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,           -- pbkdf2-sha256$iterations$salt$hash
  created_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,           -- sha-256 of the cookie token; raw token never stored
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

CREATE TABLE auth_attempts (
  key          TEXT PRIMARY KEY,         -- e.g. 'login:<email>'
  count        INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);

CREATE TABLE saved_articles (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  saved_at   INTEGER NOT NULL,
  PRIMARY KEY (user_id, article_id)
) WITHOUT ROWID;

CREATE TABLE monitors (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  countries  TEXT NOT NULL DEFAULT '[]', -- JSON array of country codes
  topics     TEXT NOT NULL DEFAULT '[]', -- JSON array of topic slugs
  keywords   TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_monitors_user ON monitors(user_id);
