-- Adds Ria's Colony as an active analytical news/blog source
INSERT INTO sources (slug, name, homepage, feed_url, country_code, language, kind, scope, permission_status, next_check_at)
VALUES ('rias-colony', 'Ria''s Colony', 'https://riascolony.org/blog', 'https://riascolony.org/blog', NULL, 'en', 'analysis', 'africa', 'permitted', 0)
ON CONFLICT(slug) DO UPDATE SET
  name = excluded.name,
  homepage = excluded.homepage,
  feed_url = excluded.feed_url,
  kind = excluded.kind,
  permission_status = excluded.permission_status;
