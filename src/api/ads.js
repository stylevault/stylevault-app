import { HttpError, json } from '../lib/http.js';
import { requireAdmin } from './admin.js';

let tableEnsured = false;

export async function ensureAdsTable(db) {
  if (tableEnsured) return;
  try {
    await db.prepare(`
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
    `).run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_ads_active_type ON ads (active, type)').run().catch(() => {});
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_ads_placement ON ads (active, placement)').run().catch(() => {});
    tableEnsured = true;
  } catch (err) {
    console.error('Failed to ensure ads table:', err);
  }
}

/**
 * Public: GET /api/ads
 * Returns active ads matching optional ?placement= and ?type=
 */
export async function getAds(request, env) {
  await ensureAdsTable(env.DB);
  const url = new URL(request.url);
  const placement = url.searchParams.get('placement') || '';
  const type = url.searchParams.get('type') || '';

  let query = 'SELECT id, type, title, sponsor, body, image_url, link_url, cta_text, placement FROM ads WHERE active = 1';
  const params = [];

  if (placement && placement !== 'all') {
    query += ' AND (placement = ? OR placement = "all")';
    params.push(placement);
  }
  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  query += ' ORDER BY created_at DESC LIMIT 20';

  const { results } = await env.DB.prepare(query).bind(...params).all();

  return json({
    ads: (results || []).map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      sponsor: r.sponsor,
      body: r.body,
      imageUrl: r.image_url,
      linkUrl: r.link_url,
      ctaText: r.cta_text || 'Learn More',
      placement: r.placement,
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

  const { results } = await env.DB.prepare(
    'SELECT id, type, title, sponsor, body, image_url, link_url, cta_text, placement, active, impressions, clicks, created_at FROM ads ORDER BY created_at DESC',
  ).all();

  const ads = (results || []).map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    sponsor: r.sponsor,
    body: r.body,
    imageUrl: r.image_url,
    linkUrl: r.link_url,
    ctaText: r.cta_text,
    placement: r.placement,
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
  const linkUrl = String(body.linkUrl || body.link_url || '').trim();
  const adBody = String(body.body || '').trim();
  const imageUrl = String(body.imageUrl || body.image_url || '').trim();
  const ctaText = String(body.ctaText || body.cta_text || 'Learn More').trim();
  const placement = String(body.placement || 'all').trim().toLowerCase();
  const active = body.active !== false && body.active !== 0 ? 1 : 0;

  if (!['banner', 'native', 'interstitial'].includes(type)) {
    throw new HttpError(400, 'Ad type must be "banner", "native", or "interstitial"');
  }
  if (!title) throw new HttpError(400, 'Ad title is required');
  if (!sponsor) throw new HttpError(400, 'Sponsor / Advertiser name is required');
  if (!linkUrl || !/^https?:\/\//i.test(linkUrl)) {
    throw new HttpError(400, 'A valid destination link URL (https://...) is required');
  }

  const id = `ad_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = Math.floor(Date.now() / 1000);

  await env.DB.prepare(
    `INSERT INTO ads (id, type, title, sponsor, body, image_url, link_url, cta_text, placement, active, impressions, clicks, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`
  ).bind(id, type, title, sponsor, adBody || null, imageUrl || null, linkUrl, ctaText, placement, active, now).run();

  return json({ ok: true, ad: { id, type, title, sponsor, linkUrl, active } });
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

