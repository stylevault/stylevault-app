import { HttpError, getCookie, serializeCookie } from './http.js';
import { sha256Hex } from '../collector/normalize.js';

export const SESSION_COOKIE = 'sv_session';
const SESSION_TTL_S = 30 * 86_400;
// Workers' WebCrypto caps PBKDF2 at 100k iterations. The count is stored with each
// hash so it can be raised later without invalidating existing passwords.
const PBKDF2_ITERATIONS = 100_000;

const b64 = (bytes) => btoa(String.fromCharCode(...bytes));
const unb64 = (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
const b64url = (bytes) => b64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const now = () => Math.floor(Date.now() / 1000);

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2-sha256$${PBKDF2_ITERATIONS}$${b64(salt)}$${b64(hash)}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, iter, salt, expected] = (stored || '').split('$');
  if (scheme !== 'pbkdf2-sha256') return false;
  const actual = await pbkdf2(password, unb64(salt), Number(iter));
  const exp = unb64(expected);
  if (actual.length !== exp.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ exp[i];
  return diff === 0;
}

export function validateCredentials({ email, password, name }, { requireName = false } = {}) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail) || cleanEmail.length > 254) {
    throw new HttpError(400, 'Enter a valid email address');
  }
  if (typeof password !== 'string' || password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
  if (password.length > 200) throw new HttpError(400, 'Password is too long');
  const cleanName = String(name || '').trim().replace(/\s+/g, ' ');
  if (requireName && (!cleanName || cleanName.length > 80)) throw new HttpError(400, 'Enter your name (up to 80 characters)');
  return { email: cleanEmail, password, name: cleanName };
}

/** Fixed-window limiter backed by D1. Throws 429 once `max` attempts are used within `windowS`. */
export async function rateLimit(db, key, max, windowS) {
  const t = now();
  const row = await db
    .prepare(
      `INSERT INTO auth_attempts (key, count, window_start) VALUES (?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET
         count = CASE WHEN window_start < ? THEN 1 ELSE count + 1 END,
         window_start = CASE WHEN window_start < ? THEN excluded.window_start ELSE window_start END
       RETURNING count`,
    )
    .bind(key, t, t - windowS, t - windowS)
    .first();
  if (row.count > max) throw new HttpError(429, 'Too many attempts. Please wait a few minutes and try again.');
}

export async function clearRateLimit(db, key) {
  await db.prepare('DELETE FROM auth_attempts WHERE key = ?').bind(key).run();
}

export async function createSession(db, userId, request) {
  const token = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const t = now();
  await db
    .prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256Hex(token), userId, t, t + SESSION_TTL_S)
    .run();
  return serializeCookie(SESSION_COOKIE, token, { maxAge: SESSION_TTL_S, secure: new URL(request.url).protocol === 'https:' });
}

export function clearSessionCookie(request) {
  return serializeCookie(SESSION_COOKIE, '', { maxAge: 0, secure: new URL(request.url).protocol === 'https:' });
}

export async function destroySession(db, request) {
  const token = getCookie(request, SESSION_COOKIE);
  if (token) await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run();
}

/** Returns the signed-in user for this request, or null. */
export async function getUser(db, request) {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;
  return db
    .prepare(
      `SELECT u.id, u.email, u.name, u.created_at FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .bind(await sha256Hex(token), now())
    .first();
}

export async function requireUser(db, request) {
  const user = await getUser(db, request);
  if (!user) throw new HttpError(401, 'Please sign in to continue');
  return user;
}
