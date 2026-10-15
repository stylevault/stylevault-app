-- Articles from national outlets that are about places outside Africa (world news
-- desks) are kept for search but left out of the Africa-wide feeds and Top Stories.
ALTER TABLE articles ADD COLUMN off_topic INTEGER NOT NULL DEFAULT 0;

DROP INDEX idx_articles_feed;
CREATE INDEX idx_articles_feed ON articles(is_duplicate, off_topic, published_at DESC);
