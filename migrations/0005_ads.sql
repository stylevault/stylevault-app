-- Manual Ad Management System: Banner, Native, and Interstitial ads
CREATE TABLE IF NOT EXISTS ads (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('banner', 'native', 'interstitial')),
  title TEXT NOT NULL,
  sponsor TEXT NOT NULL,
  body TEXT,
  image_url TEXT,
  link_url TEXT NOT NULL,
  cta_text TEXT NOT NULL DEFAULT 'Learn More',
  placement TEXT NOT NULL DEFAULT 'all' CHECK (placement IN ('all', 'home', 'news', 'countries', 'topics', 'directory')),
  active INTEGER NOT NULL DEFAULT 1,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ads_active_type ON ads (active, type);
CREATE INDEX IF NOT EXISTS idx_ads_placement ON ads (active, placement);
