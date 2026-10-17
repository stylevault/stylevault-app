import { HttpError, json } from '../lib/http.js';
import { getUser, requireUser } from '../lib/auth.js';
import { runCollection } from '../collector/collect.js';
import { refreshIndicators } from '../collector/indicators.js';
import { sha256Hex } from '../collector/normalize.js';

const now = () => Math.floor(Date.now() / 1000);

export async function requireAdmin(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const adminKeyHeader = request.headers.get('X-Admin-Key') || '';

  if (env.ADMIN_TOKEN && (authHeader === `Bearer ${env.ADMIN_TOKEN}` || adminKeyHeader === env.ADMIN_TOKEN)) {
    return { isAdmin: true, via: 'token' };
  }

  const user = await getUser(env.DB, request);
  if (user) {
    if (env.ADMIN_EMAILS) {
      const allowed = env.ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase());
      if (!allowed.includes(user.email.toLowerCase())) {
        throw new HttpError(403, 'Admin privileges required for this account');
      }
    }
    return { isAdmin: true, user, via: 'session' };
  }

  throw new HttpError(401, 'Admin authorization required');
}

export async function getAdminMetrics(request, env) {
  await requireAdmin(request, env);

  const tNow = now();
  const dayAgo = tNow - 86_400;
  const weekAgo = tNow - 7 * 86_400;

  const [
    userTotals,
    users24h,
    users7d,
    recentUsers,
    articleTotals,
    articles24h,
    articles7d,
    savedTotals,
    monitorTotals,
    allMonitors,
    sourceHealth,
    failingSources,
    recentRuns,
    topSources,
    lastIndicator,
  ] = await env.DB.batch([
    // Users
    env.DB.prepare('SELECT COUNT(*) AS total FROM users'),
    env.DB.prepare('SELECT COUNT(*) AS count FROM users WHERE created_at >= ?').bind(dayAgo),
    env.DB.prepare('SELECT COUNT(*) AS count FROM users WHERE created_at >= ?').bind(weekAgo),
    env.DB.prepare(
      `SELECT u.id, u.name, u.email, u.created_at,
              (SELECT COUNT(*) FROM saved_articles sa WHERE sa.user_id = u.id) AS saved_count,
              (SELECT COUNT(*) FROM monitors m WHERE m.user_id = u.id) AS monitor_count
         FROM users u ORDER BY u.created_at DESC LIMIT 25`,
    ),

    // Articles & Content
    env.DB.prepare('SELECT COUNT(*) AS total FROM articles'),
    env.DB.prepare('SELECT COUNT(*) AS count FROM articles WHERE published_at >= ?').bind(dayAgo),
    env.DB.prepare('SELECT COUNT(*) AS count FROM articles WHERE published_at >= ?').bind(weekAgo),
    env.DB.prepare('SELECT COUNT(*) AS total FROM saved_articles'),
    env.DB.prepare('SELECT COUNT(*) AS total FROM monitors'),
    env.DB.prepare('SELECT countries, topics FROM monitors LIMIT 500'),

    // Sources Health
    env.DB.prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) AS active,
              SUM(CASE WHEN active = 1 AND consecutive_failures = 0 AND last_success_at IS NOT NULL THEN 1 ELSE 0 END) AS healthy,
              SUM(CASE WHEN active = 1 AND consecutive_failures > 0 THEN 1 ELSE 0 END) AS failing
         FROM sources`,
    ),
    env.DB.prepare(
      `SELECT name, slug, country_code, consecutive_failures, last_error, last_checked_at, last_success_at
         FROM sources WHERE active = 1 AND consecutive_failures > 0 ORDER BY consecutive_failures DESC LIMIT 20`,
    ),

    // Collection Runs
    env.DB.prepare(
      `SELECT id, started_at, finished_at, trigger, sources_checked, items_seen, articles_added, errors, notes
         FROM collection_runs ORDER BY id DESC LIMIT 15`,
    ),

    // Top Sources
    env.DB.prepare(
      `SELECT name, slug, country_code, total_articles, consecutive_failures, last_success_at
         FROM sources WHERE active = 1 ORDER BY total_articles DESC LIMIT 15`,
    ),

    // Indicators
    env.DB.prepare('SELECT MAX(refreshed_at) AS at FROM indicator_refreshes'),
  ]);

  // Aggregate popular countries and topics followed across all monitors
  const countryCounts = {};
  const topicCounts = {};
  for (const row of allMonitors.results) {
    try {
      const cList = JSON.parse(row.countries || '[]');
      const tList = JSON.parse(row.topics || '[]');
      cList.forEach((c) => { countryCounts[c] = (countryCounts[c] || 0) + 1; });
      tList.forEach((t) => { topicCounts[t] = (topicCounts[t] || 0) + 1; });
    } catch {}
  }

  const topCountries = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([code, count]) => ({ code, count }));

  const topTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([slug, count]) => ({ slug, count }));

  return json({
    users: {
      total: userTotals.results[0]?.total || 0,
      new24h: users24h.results[0]?.count || 0,
      new7d: users7d.results[0]?.count || 0,
      recent: recentUsers.results || [],
    },
    content: {
      totalArticles: articleTotals.results[0]?.total || 0,
      articles24h: articles24h.results[0]?.count || 0,
      articles7d: articles7d.results[0]?.count || 0,
      totalSaved: savedTotals.results[0]?.total || 0,
      totalMonitors: monitorTotals.results[0]?.total || 0,
      topCountries,
      topTopics,
      topSources: topSources.results || [],
    },
    collector: {
      stats: sourceHealth.results[0] || {},
      failingSources: failingSources.results || [],
      recentRuns: recentRuns.results || [],
      indicatorsRefreshedAt: lastIndicator.results[0]?.at || null,
    },
    timestamp: tNow,
  });
}

export async function postCollectAdmin(request, env) {
  await requireAdmin(request, env);
  try {
    await env.DB?.prepare?.(`
      INSERT INTO sources (slug, name, homepage, feed_url, country_code, language, kind, scope, permission_status, next_check_at)
      VALUES ('rias-colony', 'Ria''s Colony', 'https://riascolony.org/blog', 'https://riascolony.org/blog', NULL, 'en', 'analysis', 'africa', 'permitted', 0)
      ON CONFLICT(slug) DO UPDATE SET feed_url = excluded.feed_url, homepage = excluded.homepage
    `)?.run?.();
  } catch {}
  const all = new URL(request.url).searchParams.get('all') === '1';
  const result = await runCollection(env, { trigger: 'admin_manual', all });
  return json(result);
}

export async function postIndicatorsAdmin(request, env) {
  await requireAdmin(request, env);
  const result = await refreshIndicators(env);
  return json(result);
}

export async function adminCreateArticle(request, env) {
  await requireAdmin(request, env);

  const body = await request.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  if (!title) throw new HttpError(400, 'Article headline / title is required');

  // Ensure editorial columns exist
  try {
    const p1 = env.DB?.prepare?.('ALTER TABLE articles ADD COLUMN content_html TEXT');
    if (typeof p1?.run === 'function') await p1.run();
    const p2 = env.DB?.prepare?.("ALTER TABLE articles ADD COLUMN target_scope TEXT NOT NULL DEFAULT 'targeted'");
    if (typeof p2?.run === 'function') await p2.run();
  } catch {}

  const summary = String(body.summary || '').trim();
  const contentHtml = String(body.contentHtml || body.content_html || body.body || '').trim();
  const targetScope = String(body.targetScope || body.target_scope || 'targeted').trim().toLowerCase() === 'everyone' ? 'everyone' : 'targeted';
  const imageUrl = String(body.imageUrl || body.image_url || '').trim();
  let url = String(body.url || '').trim();
  const sourceName = String(body.sourceName || body.source_name || 'StyleVault Editorial').trim();
  const kind = String(body.kind || 'news').trim().toLowerCase();
  const countryList = Array.isArray(body.countries)
    ? body.countries
    : (body.country ? [body.country] : (typeof body.countries === 'string' ? body.countries.split(',').map((s) => s.trim()).filter(Boolean) : []));
  const topicList = Array.isArray(body.topics)
    ? body.topics
    : (body.topic ? [body.topic] : (typeof body.topics === 'string' ? body.topics.split(',').map((s) => s.trim()).filter(Boolean) : []));
  const publishedAt = Number(body.publishedAt) || Math.floor(Date.now() / 1000);

  const isInternal = !url;
  if (!url) {
    url = `https://stylevault.app/article/pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  // Find or create source
  let source = await env.DB.prepare('SELECT id, name FROM sources WHERE name = ? COLLATE NOCASE LIMIT 1').bind(sourceName).first();
  if (!source) {
    const slug = sourceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'editorial';
    await env.DB.prepare(
      `INSERT INTO sources (slug, name, homepage, feed_url, kind, language, active, permission_status, created_at)
       VALUES (?, ?, 'https://stylevault.app', ?, ?, 'en', 1, 'permitted', ?)
       ON CONFLICT(slug) DO UPDATE SET name = excluded.name`
    ).bind(slug, sourceName, `https://stylevault.app/sources/${slug}`, ['analysis', 'research', 'official'].includes(kind) ? kind : 'news', publishedAt).run().catch(() => {});
    source = await env.DB.prepare('SELECT id, name FROM sources WHERE name = ? COLLATE NOCASE LIMIT 1').bind(sourceName).first();
  }

  const sourceId = source ? source.id : 1;
  const hash = await sha256Hex(url);

  // Insert article
  const primaryCountry = countryList[0] || (targetScope === 'everyone' ? 'AFRICA' : null);
  const insRes = await env.DB.prepare(
    `INSERT INTO articles (source_id, url, url_hash, title, summary, content_html, target_scope, image_url, language, published_at, fetched_at, primary_country, is_duplicate, off_topic)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'en', ?, ?, ?, 0, 0)`
  ).bind(sourceId, url, hash, title, summary || null, contentHtml || null, targetScope, imageUrl || null, publishedAt, publishedAt, primaryCountry).run();

  const articleId = insRes.meta?.last_row_id;
  if (articleId) {
    let finalUrl = url;
    if (isInternal) {
      finalUrl = `/article/${articleId}`;
      const newHash = await sha256Hex(finalUrl);
      await env.DB.prepare('UPDATE articles SET url = ?, url_hash = ?, cluster_id = id WHERE id = ?')
        .bind(finalUrl, newHash, articleId).run().catch(() => {});
      url = finalUrl;
    } else {
      await env.DB.prepare('UPDATE articles SET cluster_id = id WHERE id = ?').bind(articleId).run().catch(() => {});
    }

    for (const c of countryList) {
      if (/^[A-Z]{2}$/i.test(c)) {
        await env.DB.prepare('INSERT OR IGNORE INTO article_countries (country_code, article_id, score) VALUES (?, ?, 100)')
          .bind(c.toUpperCase(), articleId).run().catch(() => {});
      }
    }

    for (const t of topicList) {
      if (/^[a-z-]{2,40}$/i.test(t)) {
        await env.DB.prepare('INSERT OR IGNORE INTO article_topics (topic_slug, article_id, score) VALUES (?, ?, 100)')
          .bind(t.toLowerCase(), articleId).run().catch(() => {});
      }
    }
  }

  return json({
    ok: true,
    article: {
      id: articleId,
      title,
      url,
      summary: summary || null,
      contentHtml: contentHtml || null,
      targetScope,
      imageUrl: imageUrl || null,
      source: { name: sourceName },
      countries: countryList,
      topics: topicList,
      publishedAt,
    },
  });
}

export async function adminDeleteArticle(request, env, ctx, { id }) {
  await requireAdmin(request, env);
  if (!id) throw new HttpError(400, 'Missing article id');
  await env.DB.prepare('DELETE FROM articles WHERE id = ?').bind(id).run();
  return json({ ok: true });
}
