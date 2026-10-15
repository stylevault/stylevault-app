import { HttpError, cached, json } from '../lib/http.js';
import { parseArticleFilters, queryArticles, queryTopStories } from '../lib/articles.js';
import { runCollection } from '../collector/collect.js';
import { refreshIndicators } from '../collector/indicators.js';

const WEEK_S = 7 * 86_400;

/** Countries, topics and platform stats — everything the app needs to render navigation. */
export function getMeta(request, env, ctx) {
  return cached(request, ctx, 600, async () => {
    const since = Math.floor(Date.now() / 1000) - WEEK_S;
    // Article ids grow with time, so "id ≥ first id of the week" lets the count use the
    // (country_code, article_id) primary key instead of scanning every row.
    const first = await env.DB.prepare('SELECT id FROM articles WHERE published_at > ? ORDER BY published_at LIMIT 1').bind(since).first();
    const firstId = first?.id ?? Number.MAX_SAFE_INTEGER;

    const [countries, topics, stats, lastRun] = await env.DB.batch([
      env.DB.prepare(
        `SELECT c.code, c.name, c.slug, c.region, c.capital,
                (SELECT COUNT(*) FROM sources s WHERE s.country_code = c.code AND s.active = 1) AS sources,
                (SELECT COUNT(*) FROM article_countries ac WHERE ac.country_code = c.code AND ac.article_id >= ?) AS recent
           FROM countries c ORDER BY c.name`,
      ).bind(firstId),
      env.DB.prepare(
        `SELECT t.slug, t.name, t.color,
                (SELECT COUNT(*) FROM article_topics at WHERE at.topic_slug = t.slug AND at.article_id >= ?) AS recent
           FROM topics t ORDER BY t.sort`,
      ).bind(firstId),
      env.DB.prepare(
        `SELECT COUNT(*) AS sources, SUM(total_articles) AS articles,
                SUM(CASE WHEN consecutive_failures = 0 AND last_success_at IS NOT NULL THEN 1 ELSE 0 END) AS healthy
           FROM sources WHERE active = 1`,
      ),
      env.DB.prepare('SELECT finished_at FROM collection_runs ORDER BY id DESC LIMIT 1'),
    ]);

    // Latest population and growth per country, for map previews.
    const { results: snap } = await env.DB.prepare(
      `SELECT country_code AS c, indicator AS i, value AS v, year AS y FROM indicator_values iv
        WHERE indicator IN ('SP.POP.TOTL', 'NY.GDP.MKTP.KD.ZG')
          AND year = (SELECT MAX(year) FROM indicator_values WHERE country_code = iv.country_code AND indicator = iv.indicator)`,
    ).all();
    const snapshot = {};
    for (const r of snap) (snapshot[r.c] ||= {})[r.i === 'SP.POP.TOTL' ? 'population' : 'growth'] = { value: r.v, year: r.y };

    return {
      countries: countries.results.map((c) => ({ ...c, snapshot: snapshot[c.code] || {} })),
      topics: topics.results,
      stats: { ...stats.results[0], lastCollectedAt: lastRun.results[0]?.finished_at ?? null },
    };
  });
}

/** Everything a country file needs: reference facts, indicator series, and its sources. */
export function getCountry(request, env, ctx, { code }) {
  if (!/^[A-Z]{2}$/.test(code)) throw new HttpError(400, 'Invalid country code');
  return cached(request, ctx, 900, async () => {
    const [country, values, sources, refreshed] = await env.DB.batch([
      env.DB.prepare('SELECT code, name, slug, region, capital, iso3, languages, currency, blocs FROM countries WHERE code = ?').bind(code),
      env.DB.prepare('SELECT indicator, year, value FROM indicator_values WHERE country_code = ? ORDER BY indicator, year').bind(code),
      env.DB.prepare(
        `SELECT slug, name, homepage, kind, language, last_success_at AS lastSuccessAt, consecutive_failures AS failures, total_articles AS articles
           FROM sources WHERE country_code = ? AND active = 1 ORDER BY total_articles DESC`,
      ).bind(code),
      env.DB.prepare('SELECT MAX(refreshed_at) AS at, MAX(source_updated) AS sourceUpdated FROM indicator_refreshes'),
    ]);
    const c = country.results[0];
    if (!c) throw new HttpError(404, 'Country not found');

    const indicators = {};
    for (const r of values.results) (indicators[r.indicator] ||= []).push([r.year, r.value]);
    return {
      country: { ...c, blocs: JSON.parse(c.blocs || '[]') },
      indicators,
      indicatorsRefreshedAt: refreshed.results[0]?.at ?? null,
      indicatorsSourceUpdated: refreshed.results[0]?.sourceUpdated ?? null,
      sources: sources.results,
    };
  });
}

/** Manual indicator refresh: `POST /api/admin/indicators` with `Authorization: Bearer <ADMIN_TOKEN>`. */
export async function postIndicators(request, env) {
  const auth = request.headers.get('Authorization') || '';
  if (!env.ADMIN_TOKEN || auth !== `Bearer ${env.ADMIN_TOKEN}`) throw new HttpError(401, 'Unauthorized');
  return json(await refreshIndicators(env));
}

export function getArticles(request, env, ctx) {
  const params = new URL(request.url).searchParams;
  return cached(request, ctx, 120, () => queryArticles(env.DB, parseArticleFilters(params)));
}

export function getTopStories(request, env, ctx) {
  const params = new URL(request.url).searchParams;
  const country = /^[A-Z]{2}$/.test(params.get('country') || '') ? params.get('country') : null;
  return cached(request, ctx, 300, async () => ({ items: await queryTopStories(env.DB, { country }) }));
}

export function getSources(request, env, ctx) {
  return cached(request, ctx, 600, async () => {
    const { results } = await env.DB.prepare(
      `SELECT slug, name, homepage, country_code AS country, language, kind, permission_status AS permission,
              last_success_at AS lastSuccessAt, last_checked_at AS lastCheckedAt, consecutive_failures AS failures,
              total_articles AS articles, check_interval_min AS intervalMin
         FROM sources WHERE active = 1 ORDER BY name`,
    ).all();
    return { items: results };
  });
}

/** Manual trigger for collection: `POST /api/admin/collect` with `Authorization: Bearer <ADMIN_TOKEN>`. */
export async function postCollect(request, env) {
  const auth = request.headers.get('Authorization') || '';
  if (!env.ADMIN_TOKEN || auth !== `Bearer ${env.ADMIN_TOKEN}`) throw new HttpError(401, 'Unauthorized');
  const all = new URL(request.url).searchParams.get('all') === '1';
  return json(await runCollection(env, { trigger: 'manual', all }));
}
