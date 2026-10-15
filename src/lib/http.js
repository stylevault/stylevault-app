export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function json(data, init = {}) {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  if (!headers.has('Cache-Control')) headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(data), { ...init, headers });
}

export async function readJson(request, maxBytes = 32_000) {
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) {
    throw new HttpError(415, 'Expected a JSON body');
  }
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, 'Request body too large');
  try {
    return JSON.parse(text || '{}');
  } catch {
    throw new HttpError(400, 'Malformed JSON');
  }
}

export function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

export function serializeCookie(name, value, { maxAge, secure }) {
  return [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    secure ? 'Secure' : null,
    maxAge !== undefined ? `Max-Age=${maxAge}` : null,
  ].filter(Boolean).join('; ');
}

/**
 * Serves a public GET response from the edge cache when possible. The Cache API
 * only operates on custom domains; elsewhere this simply runs the handler.
 */
export async function cached(request, ctx, ttlSeconds, produce) {
  const cache = caches.default;
  const key = new Request(new URL(request.url).toString(), { method: 'GET' });
  const hit = await cache.match(key);
  if (hit) return hit;

  const data = await produce();
  const res = json(data, { headers: { 'Cache-Control': `public, max-age=${Math.min(ttlSeconds, 60)}, s-maxage=${ttlSeconds}` } });
  ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}

/** Rejects cross-site state-changing requests (defence in depth alongside SameSite cookies). */
export function assertSameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, 'Cross-origin request blocked');
}
