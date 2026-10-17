import { HttpError, json } from '../lib/http.js';
import { getUser, requireUser } from '../lib/auth.js';
import { runCollection } from '../collector/collect.js';
import { refreshIndicators } from '../collector/indicators.js';

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
  const all = new URL(request.url).searchParams.get('all') === '1';
  const result = await runCollection(env, { trigger: 'admin_manual', all });
  return json(result);
}

export async function postIndicatorsAdmin(request, env) {
  await requireAdmin(request, env);
  const result = await refreshIndicators(env);
  return json(result);
}
