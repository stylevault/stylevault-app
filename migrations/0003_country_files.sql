-- Country files: reference facts, cited indicators, and source types.

ALTER TABLE sources ADD COLUMN kind TEXT NOT NULL DEFAULT 'news'
  CHECK (kind IN ('news', 'analysis', 'research', 'official'));
ALTER TABLE sources ADD COLUMN scope TEXT NOT NULL DEFAULT 'africa'
  CHECK (scope IN ('africa', 'global'));

ALTER TABLE countries ADD COLUMN iso3 TEXT;
ALTER TABLE countries ADD COLUMN languages TEXT;
ALTER TABLE countries ADD COLUMN currency TEXT;
ALTER TABLE countries ADD COLUMN blocs TEXT NOT NULL DEFAULT '[]';   -- JSON array of bloc codes

-- Yearly values from the World Bank World Development Indicators (CC BY 4.0).
CREATE TABLE indicator_values (
  country_code TEXT NOT NULL,
  indicator    TEXT NOT NULL,             -- WDI code, e.g. NY.GDP.MKTP.KD.ZG
  year         INTEGER NOT NULL,
  value        REAL NOT NULL,
  PRIMARY KEY (country_code, indicator, year)
) WITHOUT ROWID;

CREATE TABLE indicator_refreshes (
  indicator   TEXT PRIMARY KEY,
  refreshed_at INTEGER NOT NULL,
  source_updated TEXT                      -- "lastupdated" reported by the World Bank
);
