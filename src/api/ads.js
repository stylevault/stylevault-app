import { HttpError, json } from '../lib/http.js';
import { requireAdmin } from './admin.js';

let tableEnsured = false;

export async function ensureAdsTable(db) {
  if (tableEnsured) return;
  try {
    const p = db?.prepare?.(`
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
      )
    `);
    if (typeof p?.run === 'function') await p.run();
    try { await db?.prepare?.('CREATE INDEX IF NOT EXISTS idx_ads_active_type ON ads (active, type)')?.run?.(); } catch {}
    try { await db?.prepare?.('CREATE INDEX IF NOT EXISTS idx_ads_placement ON ads (active, placement)')?.run?.(); } catch {}
    try { await db?.prepare?.('ALTER TABLE ads ADD COLUMN target_pages TEXT DEFAULT "all"')?.run?.(); } catch {}
    try { await db?.prepare?.('ALTER TABLE ads ADD COLUMN html_code TEXT')?.run?.(); } catch {}
    try { await db?.prepare?.('ALTER TABLE ads ADD COLUMN source_type TEXT DEFAULT "image"')?.run?.(); } catch {}
    tableEnsured = true;
  } catch (err) {
    console.error('Failed to ensure ads table:', err);
  }
}

/**
 * Public: GET /api/ads
 * Returns active ads matching optional ?placement=, ?path= and ?type=
 */
export async function getAds(request, env) {
  await ensureAdsTable(env.DB);
  const url = new URL(request.url);
  const placement = url.searchParams.get('placement') || '';
  const type = url.searchParams.get('type') || '';

  let query = 'SELECT id, type, title, sponsor, body, image_url, link_url, cta_text, placement, target_pages, html_code, source_type FROM ads WHERE active = 1';
  const params = [];

  if (placement && placement !== 'all') {
    query += ' AND (placement = ? OR placement = "all" OR target_pages LIKE ?)';
    params.push(placement, `%${placement}%`);
  }
  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  query += ' ORDER BY created_at DESC LIMIT 30';

  let results = [];
  try {
    const res = await env.DB.prepare(query).bind(...params).all();
    results = res?.results || [];
  } catch {
    // Fallback if extended columns are not yet in SQLite table
    const fallbackRes = await env.DB.prepare(
      'SELECT id, type, title, sponsor, body, image_url, link_url, cta_text, placement FROM ads WHERE active = 1 ORDER BY created_at DESC LIMIT 30'
    ).all().catch(() => ({ results: [] }));
    results = fallbackRes?.results || [];
  }

  return json({
    ads: results.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      sponsor: r.sponsor,
      body: r.body,
      imageUrl: r.image_url,
      linkUrl: r.link_url,
      ctaText: r.cta_text || 'Learn More',
      placement: r.placement,
      targetPages: r.target_pages || r.placement || 'all',
      htmlCode: r.html_code || null,
      sourceType: r.source_type || 'image',
    })),
  });
}

/**
 * Public: POST /api/ads/:id/click
 */
export async function trackAdClick(request, env, ctx, { id }) {
  await ensureAdsTable(env.DB);
  if (!id) throw new HttpError(400, 'Missing ad id');
  await env.DB.prepare('UPDATE ads SET clicks = clicks + 1 WHERE id = ?').bind(id).run().catch(() => {});
  return json({ ok: true });
}

/**
 * Public: POST /api/ads/:id/impression
 */
export async function trackAdImpression(request, env, ctx, { id }) {
  await ensureAdsTable(env.DB);
  if (!id) throw new HttpError(400, 'Missing ad id');
  await env.DB.prepare('UPDATE ads SET impressions = impressions + 1 WHERE id = ?').bind(id).run().catch(() => {});
  return json({ ok: true });
}

/**
 * Admin: GET /api/admin/ads
 */
export async function adminGetAds(request, env) {
  await requireAdmin(request, env);
  await ensureAdsTable(env.DB);

  let results = [];
  try {
    const res = await env.DB.prepare(
      'SELECT id, type, title, sponsor, body, image_url, link_url, cta_text, placement, active, impressions, clicks, created_at, target_pages, html_code, source_type FROM ads ORDER BY created_at DESC',
    ).all();
    results = res?.results || [];
  } catch {
    const res = await env.DB.prepare(
      'SELECT id, type, title, sponsor, body, image_url, link_url, cta_text, placement, active, impressions, clicks, created_at FROM ads ORDER BY created_at DESC',
    ).all().catch(() => ({ results: [] }));
    results = res?.results || [];
  }

  const ads = results.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    sponsor: r.sponsor,
    body: r.body,
    imageUrl: r.image_url,
    linkUrl: r.link_url,
    ctaText: r.cta_text,
    placement: r.placement,
    targetPages: r.target_pages || r.placement || 'all',
    htmlCode: r.html_code || null,
    sourceType: r.source_type || 'image',
    active: Boolean(r.active),
    impressions: r.impressions || 0,
    clicks: r.clicks || 0,
    ctr: r.impressions > 0 ? ((r.clicks / r.impressions) * 100).toFixed(1) + '%' : '0.0%',
    createdAt: r.created_at,
  }));

  return json({ ads });
}

/**
 * Admin: POST /api/admin/ads
 */
export async function adminCreateAd(request, env) {
  await requireAdmin(request, env);
  await ensureAdsTable(env.DB);

  const body = await request.json().catch(() => ({}));
  const type = String(body.type || '').trim().toLowerCase();
  const title = String(body.title || '').trim();
  const sponsor = String(body.sponsor || '').trim();
  let linkUrl = String(body.linkUrl || body.link_url || '').trim();
  const adBody = String(body.body || '').trim();
  const imageUrl = String(body.imageUrl || body.image_url || '').trim();
  const ctaText = String(body.ctaText || body.cta_text || 'Learn More').trim();
  const rawPlacement = String(body.placement || 'all').trim().toLowerCase();
  const targetPages = String(body.targetPages || body.target_pages || body.placement || 'all').trim() || 'all';
  const sourceType = String(body.sourceType || body.source_type || 'image').trim().toLowerCase() === 'html' ? 'html' : 'image';
  const htmlCode = String(body.htmlCode || body.html_code || '').trim() || null;
  const active = body.active !== false && body.active !== 0 ? 1 : 0;

  if (!['banner', 'native', 'interstitial'].includes(type)) {
    throw new HttpError(400, 'Ad type must be "banner", "native", or "interstitial"');
  }
  if (!title) throw new HttpError(400, 'Ad title is required');
  if (!sponsor) throw new HttpError(400, 'Sponsor / Advertiser name is required');

  if (sourceType === 'html' && !linkUrl) {
    linkUrl = 'https://stylevault.app';
  }

  if (!linkUrl || !/^https?:\/\//i.test(linkUrl)) {
    throw new HttpError(400, 'A valid destination link URL (https://...) is required');
  }

  // Ensure placement matches legacy CHECK constraint if present
  const validPlacements = ['all', 'home', 'news', 'countries', 'topics', 'directory'];
  const safePlacement = validPlacements.includes(rawPlacement) ? rawPlacement : 'all';

  const id = `ad_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = Math.floor(Date.now() / 1000);

  try {
    await env.DB.prepare(
      `INSERT INTO ads (id, type, title, sponsor, body, image_url, link_url, cta_text, placement, active, impressions, clicks, created_at, target_pages, html_code, source_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?)`
    ).bind(id, type, title, sponsor, adBody || null, imageUrl || null, linkUrl, ctaText, safePlacement, active, now, targetPages, htmlCode, sourceType).run();
  } catch {
    await env.DB.prepare(
      `INSERT INTO ads (id, type, title, sponsor, body, image_url, link_url, cta_text, placement, active, impressions, clicks, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`
    ).bind(id, type, title, sponsor, adBody || null, imageUrl || null, linkUrl, ctaText, safePlacement, active, now).run();
  }

  return json({ ok: true, ad: { id, type, title, sponsor, linkUrl, targetPages, sourceType, active } });
}

/**
 * Admin: PATCH /api/admin/ads/:id
 */
export async function adminUpdateAd(request, env, ctx, { id }) {
  await requireAdmin(request, env);
  await ensureAdsTable(env.DB);
  if (!id) throw new HttpError(400, 'Missing ad id');

  const body = await request.json().catch(() => ({}));

  const sets = [];
  const params = [];

  if ('active' in body) {
    sets.push('active = ?');
    params.push(body.active ? 1 : 0);
  }
  if (body.title !== undefined) {
    sets.push('title = ?');
    params.push(String(body.title).trim());
  }
  if (body.sponsor !== undefined) {
    sets.push('sponsor = ?');
    params.push(String(body.sponsor).trim());
  }
  if (body.body !== undefined) {
    sets.push('body = ?');
    params.push(String(body.body).trim());
  }
  if (body.imageUrl !== undefined || body.image_url !== undefined) {
    sets.push('image_url = ?');
    params.push(String(body.imageUrl || body.image_url || '').trim() || null);
  }
  if (body.linkUrl !== undefined || body.link_url !== undefined) {
    sets.push('link_url = ?');
    params.push(String(body.linkUrl || body.link_url).trim());
  }
  if (body.ctaText !== undefined || body.cta_text !== undefined) {
    sets.push('cta_text = ?');
    params.push(String(body.ctaText || body.cta_text).trim());
  }
  if (body.placement !== undefined) {
    sets.push('placement = ?');
    params.push(String(body.placement).trim());
  }
  if (body.targetPages !== undefined || body.target_pages !== undefined) {
    sets.push('target_pages = ?');
    params.push(String(body.targetPages || body.target_pages).trim());
  }
  if (body.htmlCode !== undefined || body.html_code !== undefined) {
    sets.push('html_code = ?');
    params.push(String(body.htmlCode || body.html_code).trim() || null);
  }
  if (body.sourceType !== undefined || body.source_type !== undefined) {
    sets.push('source_type = ?');
    params.push(String(body.sourceType || body.source_type).trim().toLowerCase() === 'html' ? 'html' : 'image');
  }

  if (!sets.length) return json({ ok: true, message: 'Nothing to update' });

  params.push(id);
  await env.DB.prepare(`UPDATE ads SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run();

  return json({ ok: true });
}

/**
 * Admin: DELETE /api/admin/ads/:id
 */
export async function adminDeleteAd(request, env, ctx, { id }) {
  await requireAdmin(request, env);
  await ensureAdsTable(env.DB);
  if (!id) throw new HttpError(400, 'Missing ad id');

  await env.DB.prepare('DELETE FROM ads WHERE id = ?').bind(id).run();
  return json({ ok: true });
}

