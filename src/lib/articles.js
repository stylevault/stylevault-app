const ARTICLE_COLUMNS = `
  a.id, a.title, a.url, a.summary, a.image_url, a.published_at, a.cluster_id,
  s.name AS source_name, s.slug AS source_slug, s.homepage AS source_homepage, s.country_code AS source_country, s.kind AS source_kind,
  (SELECT group_concat(country_code) FROM (SELECT country_code FROM article_countries WHERE article_id = a.id ORDER BY score DESC)) AS countries,
  (SELECT group_concat(topic_slug)   FROM (SELECT topic_slug   FROM article_topics    WHERE article_id = a.id ORDER BY score DESC)) AS topics,
  (SELECT COUNT(DISTINCT source_id) FROM articles c WHERE c.cluster_id = a.cluster_id) AS cluster_sources`;

export function shapeArticle(r) {
  return {
    id: r.id,
    title: r.title,
    url: r.url,
    summary: r.summary,
    image: r.image_url,
    imageUrl: r.image_url,
    publishedAt: r.published_at,
    source: { name: r.source_name, slug: r.source_slug, homepage: r.source_homepage, country: r.source_country, kind: r.source_kind },
    countries: r.countries ? r.countries.split(',') : [],
    topics: r.topics ? r.topics.split(',') : [],
    clusterSources: r.cluster_sources || 1,
  };
}

const words = (s) => (String(s || '').match(/[\p{L}\p{N}]+/gu) || []).slice(0, 12);

/** Free-text search: every word must appear (last word may be a prefix). */
export function searchToFts(q) {
  const w = words(q);
  if (!w.length) return null;
  return w.map((t, i) => `"${t}"${i === w.length - 1 && t.length > 2 ? '*' : ''}`).join(' ');
}

/** Monitor keywords: comma-separated phrases, any of which may match. */
export function keywordsToFts(keywords) {
  const phrases = String(keywords || '')
    .split(',')
    .map((p) => words(p).join(' '))
    .filter(Boolean)
    .slice(0, 20);
  return phrases.length ? phrases.map((p) => `"${p}"`).join(' OR ') : null;
}

const list = (v, re) =>
  String(v || '').split(',').map((s) => s.trim()).filter((s) => re.test(s)).slice(0, 54);

export function parseArticleFilters(params) {
  return {
    countries: list(params.get('country')?.toUpperCase(), /^[A-Z]{2}$/),
    topics: list(params.get('topic'), /^[a-z-]{2,30}$/),
    kinds: list(params.get('kind'), /^(news|analysis|research|official)$/),
    source: /^[a-z0-9-]{2,60}$/.test(params.get('source') || '') ? params.get('source') : null,
    fts: params.get('keywords') ? keywordsToFts(params.get('keywords')) : searchToFts(params.get('q')),
    from: Number(params.get('from')) || null,
    to: Number(params.get('to')) || null,
    before: params.get('before'),
    limit: Math.min(Math.max(Number(params.get('limit')) || 24, 1), 50),
  };
}

export async function queryArticles(db, f) {
  // Search covers everything we hold; browsing feeds stay on African stories.
  const where = f.fts ? ['a.is_duplicate = 0'] : ['a.is_duplicate = 0', 'a.off_topic = 0'];
  const binds = [];
  const ph = (arr) => arr.map(() => '?').join(',');

  if (f.countries?.length) {
    where.push(`a.id IN (SELECT article_id FROM article_countries WHERE country_code IN (${ph(f.countries)}))`);
    binds.push(...f.countries);
  }
  if (f.topics?.length) {
    where.push(`a.id IN (SELECT article_id FROM article_topics WHERE topic_slug IN (${ph(f.topics)}))`);
    binds.push(...f.topics);
  }
  if (f.kinds?.length) {
    where.push(`s.kind IN (${ph(f.kinds)})`);
    binds.push(...f.kinds);
  }
  if (f.source) {
    where.push('s.slug = ?');
    binds.push(f.source);
  }
  if (f.fts) {
    where.push('a.id IN (SELECT rowid FROM articles_fts WHERE articles_fts MATCH ?)');
    binds.push(f.fts);
  }
  if (f.from) {
    where.push('a.published_at >= ?');
    binds.push(f.from);
  }
  if (f.to) {
    where.push('a.published_at <= ?');
    binds.push(f.to);
  }
  const cursor = /^(\d+)_(\d+)$/.exec(f.before || '');
  if (cursor) {
    where.push('(a.published_at < ? OR (a.published_at = ? AND a.id < ?))');
    binds.push(Number(cursor[1]), Number(cursor[1]), Number(cursor[2]));
  }

  const { results } = await db
    .prepare(
      `SELECT ${ARTICLE_COLUMNS} FROM articles a JOIN sources s ON s.id = a.source_id
        WHERE ${where.join(' AND ')}
        ORDER BY a.published_at DESC, a.id DESC LIMIT ?`,
    )
    .bind(...binds, f.limit + 1)
    .all();

  const items = results.slice(0, f.limit).map(shapeArticle);
  const last = items[items.length - 1];
  return { items, nextCursor: results.length > f.limit && last ? `${last.publishedAt}_${last.id}` : null };
}

export async function getArticlesByIds(db, ids) {
  if (!ids.length) return [];
  const { results } = await db
    .prepare(`SELECT ${ARTICLE_COLUMNS} FROM articles a JOIN sources s ON s.id = a.source_id WHERE a.id IN (${ids.map(() => '?').join(',')})`)
    .bind(...ids)
    .all();
  return results.map(shapeArticle);
}

/**
 * Top Stories: stories reported by at least two different publishers in the window,
 * ranked by how many publishers carry them, then recency.
 */
export async function queryTopStories(db, { country = null, hours = 24, limit = 6 } = {}) {
  const since = Math.floor(Date.now() / 1000) - hours * 3600;
  const countryFilter = country
    ? 'AND cluster_id IN (SELECT a2.cluster_id FROM article_countries ac JOIN articles a2 ON a2.id = ac.article_id WHERE ac.country_code = ? AND a2.published_at > ?)'
    : '';
  const { results: clusters } = await db
    .prepare(
      `SELECT cluster_id, COUNT(DISTINCT source_id) AS n, MAX(published_at) AS latest
         FROM articles WHERE published_at > ? AND cluster_id IS NOT NULL AND off_topic = 0 ${countryFilter}
        GROUP BY cluster_id HAVING n >= 2
        ORDER BY n DESC, latest DESC LIMIT ?`,
    )
    .bind(...(country ? [since, country, since] : [since]), limit)
    .all();
  if (!clusters.length) return [];

  const ids = clusters.map((c) => c.cluster_id);
  const [leaders, coverage] = await Promise.all([
    getArticlesByIds(db, ids),
    db
      .prepare(
        `SELECT a.cluster_id, a.id, a.title, a.url, s.name AS source_name
           FROM articles a JOIN sources s ON s.id = a.source_id
          WHERE a.cluster_id IN (${ids.map(() => '?').join(',')}) AND a.id != a.cluster_id
          ORDER BY a.published_at DESC`,
      )
      .bind(...ids)
      .all(),
  ]);

  const byId = new Map(leaders.map((a) => [a.id, a]));
  return clusters
    .filter((c) => byId.has(c.cluster_id))
    .map((c) => ({
      ...byId.get(c.cluster_id),
      clusterSources: c.n,
      latestAt: c.latest,
      coverage: coverage.results
        .filter((r) => r.cluster_id === c.cluster_id)
        .slice(0, 4)
        .map((r) => ({ id: r.id, title: r.title, url: r.url, source: r.source_name })),
    }));
}
