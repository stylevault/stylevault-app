-- Editorial long-form HTML articles and enhanced ad targeting (riascolony style)

ALTER TABLE articles ADD COLUMN content_html TEXT;
ALTER TABLE articles ADD COLUMN target_scope TEXT NOT NULL DEFAULT 'targeted';

ALTER TABLE ads ADD COLUMN target_pages TEXT DEFAULT 'all';
ALTER TABLE ads ADD COLUMN html_code TEXT;
ALTER TABLE ads ADD COLUMN source_type TEXT DEFAULT 'image';

