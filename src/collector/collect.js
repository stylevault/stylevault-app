/**
 * Scheduled news collection.
 *
 * Each run picks the sources that are due, fetches their feeds in parallel,
 * normalises and de-duplicates items, classifies them by country and topic, groups
 * cross-publisher coverage of the same story into clusters, and stores the metadata.
 *
 * Free-plan budget per invocation: 50 subrequests (fetches + D1 calls) and ~10ms CPU.
 * A run therefore handles a small batch of sources (COLLECT_BATCH_SIZE) and the cron
 * fires often enough that every active source is still checked about hourly.
 */
import { parseFeed, parseRiasColony } from './feed-parser.js';
import { classifyCountries, classifyTopics } from './classify.js';
import { normalizeUrl, sha256Hex, titleTokens, similarity, clampSummary } from './normalize.js';

const USER_AGENT = 'StyleVaultBot/1.0 (+https://stylevault.app/sources)';
const FETCH_TIMEOUT_MS = 15_000;
const MAX_FEED_BYTES = 2_000_000;
const MAX_ITEM_AGE_S = 7 * 86_400;
const CLUSTER_WINDOW_S = 36 * 3_600;
const BASE_INTERVAL_MIN = 60;
const QUIET_MAX_INTERVAL_MIN = 360;
const FAILING_MAX_INTERVAL_MIN = 1_440;

const now = () => Math.floor(Date.now() / 1000);

async function fetchFeed(source) {
  const headers = { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, text/html;q=0.7, */*;q=0.5' };
  if (source.etag) headers['If-None-Match'] = source.etag;
  if (source.last_modified) headers['If-Modified-Since'] = source.last_modified;

  try {
    const res = await fetch(source.feed_url, { headers, redirect: 'follow', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (res.status === 304) return { ok: true, notModified: true, items: [] };
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const text = (await res.text()).slice(0, MAX_FEED_BYTES);

    // Ria's Colony publishes HTML blog posts directly at riascolony.org/blog
    if (source.slug === 'rias-colony' || /riascolony\.org/i.test(source.feed_url)) {
      return {
        ok: true,
        items: parseRiasColony(text),
        etag: res.headers.get('ETag'),
        lastModified: res.headers.get('Last-Modified'),
      };
    }

    if (!/<(rss|feed|rdf:RDF)[\s>]/i.test(text.slice(0, 3000))) return { ok: false, error: 'Response is not an RSS/Atom feed' };
    return {
      ok: true,
      items: parseFeed(text),
      etag: res.headers.get('ETag'),
      lastModified: res.headers.get('Last-Modified'),
    };
  } catch (err) {
    return { ok: false, error: err.name === 'TimeoutError' ? 'Timed out' : String(err.message || err).slice(0, 200) };
  }
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Drops the boilerplate that WordPress and other CMSs append to feed teasers. */
function cleanSummary(summary, title) {
  if (!summary) return null;
  let s = summary
    .replace(/\s*The post .{0,300}? appeared first on .{0,120}?\.?\s*$/i, '')
    .replace(/\s*L’article .{0,300}? est apparu en premier sur .{0,120}?\.?\s*$/i, '')
    .replace(/\s*(Continue|Read) reading.*$/i, '')
    .replace(/\s*\[(…|\.\.\.|&#8230;)\]\s*$/, '…')
    .trim();
  if (!s || s === title) return null;
  return clampSummary(s);
}

/** In-memory inverted index over recent headlines, built only when a run has new items. */
class StoryIndex {
  constructor(rows) {
    this.entries = [];
    this.postings = new Map();
    for (const r of rows) this.add({ ...r, tokens: titleTokens(r.title) });
  }
  add(entry) {
    const idx = this.entries.push(entry) - 1;
    for (const t of entry.tokens) {
      let list = this.postings.get(t);
      if (!list) this.postings.set(t, (list = []));
      list.push(idx);
    }
  }
  /**
   * Returns the closest story from another publisher, plus whether this publisher
   * already ran a near-identical headline (a re-post or a recurring column).
   */
  bestMatch(tokens, sourceId) {
    const counts = new Map();
    for (const t of tokens) {
      const list = this.postings.get(t);
      if (!list || list.length > 150) continue; // too common to be informative
      for (const i of list) counts.set(i, (counts.get(i) || 0) + 1);
    }
    let best = null;
    let repost = false;
    for (const [i, n] of counts) {
      if (n < 3) continue;
      const entry = this.entries[i];
      const sim = similarity(tokens, entry.tokens);
      if (entry.source_id === sourceId) {
        if (sim.jaccard >= 0.8) repost = true;
      } else if (!best || sim.jaccard > best.jaccard) {
        best = { entry, ...sim };
      }
    }
    return { best, repost };
  }
}

function nextInterval(source, { ok, added }) {
  if (!ok) {
    const failures = source.consecutive_failures + 1;
    return Math.min(FAILING_MAX_INTERVAL_MIN, BASE_INTERVAL_MIN * 2 ** Math.min(failures, 5));
  }
  return added > 0 ? BASE_INTERVAL_MIN : Math.min(QUIET_MAX_INTERVAL_MIN, source.check_interval_min + 60);
}

export async function runCollection(env, { trigger = 'cron', all = false } = {}) {
  const db = env.DB;
  const startedAt = now();
  const batchSize = all ? 500 : Number(env.COLLECT_BATCH_SIZE || 6);

  const { results: due } = await db
    .prepare(
      `SELECT id, slug, feed_url, country_code, language, scope, check_interval_min, consecutive_failures, etag, last_modified
         FROM sources
        WHERE active = 1 AND permission_status != 'denied' AND next_check_at <= ?
        ORDER BY next_check_at LIMIT ?`,
    )
    .bind(startedAt, batchSize)
    .all();

  const summary = { trigger, sourcesChecked: due.length, itemsSeen: 0, articlesAdded: 0, errors: 0 };
  if (!due.length) return summary;

  const fetched = await mapWithConcurrency(due, 8, fetchFeed);

  // 1. Normalise every item and drop the ones we can't use.
  const candidates = [];
  fetched.forEach((result, i) => {
    if (!result.ok) return;
    const source = due[i];
    for (const item of result.items) {
      summary.itemsSeen++;
      const canonical = normalizeUrl(item.link);
      if (!canonical) continue;
      let publishedAt = item.publishedAt ?? startedAt;
      if (publishedAt > startedAt + 3600) publishedAt = startedAt; // bad timezone data
      if (publishedAt < startedAt - MAX_ITEM_AGE_S) continue;
      candidates.push({ source, item, canonical, publishedAt });
    }
  });

  // 2. Skip URLs we already have (one lookup per 90 hashes: D1 allows 100 bound params).
  await Promise.all(candidates.map(async (c) => (c.hash = await sha256Hex(c.canonical))));
  const unique = [...new Map(candidates.map((c) => [c.hash, c])).values()];
  const known = new Set();
  for (let i = 0; i < unique.length; i += 90) {
    const chunk = unique.slice(i, i + 90);
    const { results } = await db
      .prepare(`SELECT url_hash FROM articles WHERE url_hash IN (${chunk.map(() => '?').join(',')})`)
      .bind(...chunk.map((c) => c.hash))
      .all();
    for (const r of results) known.add(r.url_hash);
  }
  const fresh = unique.filter((c) => !known.has(c.hash)).sort((a, b) => a.publishedAt - b.publishedAt);

  // 3. Classify, cluster and build inserts.
  const statements = [];
  const addedPerSource = new Map();

  if (fresh.length) {
    const { results: recent } = await db
      .prepare(
        `SELECT id, url_hash, title, source_id FROM articles
          WHERE published_at > ? AND is_duplicate = 0 ORDER BY published_at DESC LIMIT 1500`,
      )
      .bind(startedAt - CLUSTER_WINDOW_S)
      .all();
    const index = new StoryIndex(recent);

    for (const { source, item, canonical, hash, publishedAt } of fresh) {
      const title = item.title.slice(0, 300);
      const tokens = titleTokens(title);
      const { best: match, repost } = tokens.size >= 3 ? index.bestMatch(tokens, source.id) : {};
      if (repost) continue; // same publisher, same headline under a new URL

      let leaderHash = null;
      let isDuplicate = 0;
      if (match && match.jaccard >= 0.8) {
        isDuplicate = 1; // wire copy carried by another publisher
        leaderHash = match.entry.url_hash;
      } else if (match && match.jaccard >= 0.45 && match.shared >= 3) {
        leaderHash = match.entry.url_hash;
      }

      const text = { title, summary: cleanSummary(item.summary, title), categories: item.categories };
      const countries = classifyCountries({ ...text, homeCountry: source.country_code });
      const topics = classifyTopics(text);
      // A national outlet's or global institution's story that matches no African
      // country is about somewhere else.
      const offTopic = (source.country_code || source.scope === 'global') && !countries.length ? 1 : 0;

      statements.push(
        db.prepare(
          `INSERT INTO articles (source_id, url, url_hash, title, summary, image_url, language, published_at, fetched_at,
                                 primary_country, cluster_id, is_duplicate, off_topic)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(cluster_id, id) FROM articles WHERE url_hash = ?), ?, ?)
           ON CONFLICT(url_hash) DO NOTHING`,
        ).bind(source.id, item.link, hash, title, text.summary, item.image, source.language, publishedAt, startedAt,
          countries[0]?.code ?? null, leaderHash, isDuplicate, offTopic),
      );
      if (!leaderHash) {
        statements.push(db.prepare(`UPDATE articles SET cluster_id = id WHERE url_hash = ? AND cluster_id IS NULL`).bind(hash));
      }
      for (const c of countries) {
        statements.push(db.prepare(
          `INSERT OR IGNORE INTO article_countries (country_code, article_id, score) SELECT ?, id, ? FROM articles WHERE url_hash = ?`,
        ).bind(c.code, c.score, hash));
      }
      for (const t of topics) {
        statements.push(db.prepare(
          `INSERT OR IGNORE INTO article_topics (topic_slug, article_id, score) SELECT ?, id, ? FROM articles WHERE url_hash = ?`,
        ).bind(t.slug, t.score, hash));
      }

      if (!isDuplicate) index.add({ url_hash: hash, title, source_id: source.id, tokens });
      addedPerSource.set(source.id, (addedPerSource.get(source.id) || 0) + 1);
      summary.articlesAdded++;
    }
  }

  // 4. Record source health and schedule each source's next check.
  fetched.forEach((result, i) => {
    const source = due[i];
    const added = addedPerSource.get(source.id) || 0;
    const interval = nextInterval(source, { ok: result.ok, added });
    const nextAt = startedAt + interval * 60 - 120; // small head start so hourly sources don't slip a cron slot
    if (result.ok) {
      statements.push(db.prepare(
        `UPDATE sources SET last_checked_at = ?, last_success_at = ?, last_error = NULL, consecutive_failures = 0,
                check_interval_min = ?, next_check_at = ?, total_articles = total_articles + ?,
                etag = COALESCE(?, etag), last_modified = COALESCE(?, last_modified)
          WHERE id = ?`,
      ).bind(startedAt, startedAt, interval, nextAt, added, result.etag ?? null, result.lastModified ?? null, source.id));
    } else {
      summary.errors++;
      statements.push(db.prepare(
        `UPDATE sources SET last_checked_at = ?, last_error = ?, consecutive_failures = consecutive_failures + 1,
                check_interval_min = ?, next_check_at = ? WHERE id = ?`,
      ).bind(startedAt, result.error, interval, nextAt, source.id));
    }
  });

  statements.push(db.prepare(
    `INSERT INTO collection_runs (started_at, finished_at, trigger, sources_checked, items_seen, articles_added, errors)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(startedAt, now(), trigger, summary.sourcesChecked, summary.itemsSeen, summary.articlesAdded, summary.errors));

  // One batch = one subrequest, applied as a single transaction.
  for (let i = 0; i < statements.length; i += 400) await db.batch(statements.slice(i, i + 400));

  return summary;
}

/** Daily housekeeping: keep the database small enough for the free tier. */
export async function pruneOldData(env, { retentionDays = Number(env.ARTICLE_RETENTION_DAYS || 90) } = {}) {
  const t = now();
  await env.DB.batch([
    env.DB.prepare(
      `DELETE FROM articles WHERE id IN (
         SELECT id FROM articles WHERE published_at < ? AND id NOT IN (SELECT article_id FROM saved_articles) LIMIT 2000)`,
    ).bind(t - retentionDays * 86_400),
    env.DB.prepare(`DELETE FROM sessions WHERE expires_at < ?`).bind(t),
    env.DB.prepare(`DELETE FROM auth_attempts WHERE window_start < ?`).bind(t - 86_400),
    env.DB.prepare(`DELETE FROM collection_runs WHERE started_at < ?`).bind(t - 30 * 86_400),
  ]);
}
