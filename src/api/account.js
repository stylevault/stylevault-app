import { HttpError, json, readJson } from '../lib/http.js';
import {
  clearRateLimit, clearSessionCookie, createSession, destroySession, getUser, hashPassword,
  rateLimit, requireUser, validateCredentials, verifyPassword,
  createPasswordReset, verifyPasswordReset, consumePasswordReset,
} from '../lib/auth.js';
import { getArticlesByIds } from '../lib/articles.js';

const now = () => Math.floor(Date.now() / 1000);
const clientIp = (request) => request.headers.get('CF-Connecting-IP') || 'local';
const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, createdAt: u.created_at });

async function sendPasswordResetEmail({ env, to, name, resetUrl }) {
  const subject = 'Reset your Style Vault password';
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:540px;margin:0 auto;padding:28px 20px;color:#1a0a1e;line-height:1.6">
      <div style="margin-bottom:20px;border-bottom:1px solid #ebddef;padding-bottom:16px">
        <h2 style="margin:0;color:#5c0060;font-size:1.35rem">Style Vault</h2>
        <span style="font-size:0.75rem;color:#6b5f70;text-transform:uppercase;letter-spacing:0.06em">Account Security</span>
      </div>
      <p style="font-size:1rem;margin-bottom:16px">Hello ${name ? name.split(' ')[0] : 'there'},</p>
      <p style="margin-bottom:20px">We received a request to reset your Style Vault password. You can set a new password by clicking the button below:</p>
      <p style="margin:26px 0">
        <a href="${resetUrl}" style="background:#5c0060;color:#ffffff;padding:12px 26px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block;font-size:0.92rem">Reset password</a>
      </p>
      <p style="color:#6b5f70;font-size:0.84rem;line-height:1.5">Or copy and paste this link into your browser:<br><a href="${resetUrl}" style="color:#0d7470;word-break:break-all">${resetUrl}</a></p>
      <p style="color:#8a7e8f;font-size:0.80rem;margin-top:32px;border-top:1px solid #ebddef;padding-top:16px">This link is single-use and will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
    </div>
  `;

  // 1. Send via Resend if RESEND_API_KEY is configured
  if (env?.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM || 'Style Vault <support@stylevault.app>',
          to: [to],
          subject,
          html,
        }),
      });
      if (!res.ok) console.error('Resend email error:', await res.text());
      return;
    } catch (e) {
      console.error('Failed to send email via Resend:', e);
    }
  }

  // 2. Send via Cloudflare Email Routing binding if available
  if (env?.EMAIL && typeof env.EMAIL.send === 'function') {
    try {
      const { EmailMessage } = await import('cloudflare:email');
      const sender = env.EMAIL_FROM || 'support@stylevault.app';
      const msg = new EmailMessage(
        sender,
        to,
        `From: Style Vault <${sender}>\r\nTo: ${to}\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${html}`
      );
      await env.EMAIL.send(msg);
      return;
    } catch (e) {
      console.error('Failed to send email via Cloudflare Email binding:', e);
    }
  }

  // 3. Dev / audit log
  console.log(`[PASSWORD RESET] Link generated for ${to}: ${resetUrl}`);
}

// ── Authentication ──────────────────────────────────────────────────────────

export async function signup(request, env) {
  const body = await readJson(request);
  const { email, password, name } = validateCredentials(body, { requireName: true });
  await rateLimit(env.DB, `signup:${clientIp(request)}`, 5, 3600);

  const passwordHash = await hashPassword(password);
  const user = await env.DB
    .prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?) ON CONFLICT(email) DO NOTHING RETURNING id, email, name, created_at')
    .bind(email, name, passwordHash)
    .first();
  if (!user) throw new HttpError(409, 'An account with this email already exists. Try signing in instead.');

  const cookie = await createSession(env.DB, user.id, request);
  return json({ user: publicUser(user) }, { status: 201, headers: { 'Set-Cookie': cookie } });
}

export async function login(request, env) {
  const body = await readJson(request);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) throw new HttpError(400, 'Enter your email and password');

  await rateLimit(env.DB, `login-ip:${clientIp(request)}`, 30, 900);
  await rateLimit(env.DB, `login:${email}`, 10, 900);

  const row = await env.DB.prepare('SELECT id, email, name, created_at, password_hash FROM users WHERE email = ?').bind(email).first();
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    throw new HttpError(401, 'That email and password combination is not correct');
  }
  await clearRateLimit(env.DB, `login:${email}`);

  const cookie = await createSession(env.DB, row.id, request);
  return json({ user: publicUser(row) }, { headers: { 'Set-Cookie': cookie } });
}

export async function logout(request, env) {
  await destroySession(env.DB, request);
  return json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie(request) } });
}

export async function forgotPassword(request, env) {
  const body = await readJson(request);
  const email = String(body.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new HttpError(400, 'Enter a valid email address');
  }

  await rateLimit(env.DB, `forgot-ip:${clientIp(request)}`, 10, 900);
  await rateLimit(env.DB, `forgot:${email}`, 5, 900);

  const row = await env.DB.prepare('SELECT id, email, name FROM users WHERE email = ?').bind(email).first();
  let devLink = null;
  if (row) {
    const token = await createPasswordReset(env.DB, row.id);
    const origin = new URL(request.url).origin;
    const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
    devLink = resetUrl;
    await sendPasswordResetEmail({ env, to: row.email, name: row.name, resetUrl });
  }

  return json({
    ok: true,
    message: 'If an account exists with that email, a password reset link has been sent.',
  });
}

export async function resetPassword(request, env) {
  const body = await readJson(request);
  const token = String(body.token || '').trim();
  const password = String(body.password || '');

  if (!token) throw new HttpError(400, 'Missing reset token');
  if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
  if (password.length > 200) throw new HttpError(400, 'Password is too long');

  await rateLimit(env.DB, `reset-ip:${clientIp(request)}`, 15, 900);

  const reset = await verifyPasswordReset(env.DB, token);
  if (!reset) {
    throw new HttpError(400, 'This password reset link is invalid or has expired. Please request a new one.');
  }

  const hash = await hashPassword(password);
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(hash, reset.user_id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(reset.user_id),
  ]);
  await consumePasswordReset(env.DB, token);

  const user = await env.DB.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').bind(reset.user_id).first();
  const cookie = await createSession(env.DB, reset.user_id, request);
  return json({ user: publicUser(user), message: 'Password reset successfully' }, { headers: { 'Set-Cookie': cookie } });
}

// ── Profile ─────────────────────────────────────────────────────────────────

export async function getMe(request, env) {
  const user = await getUser(env.DB, request);
  if (!user) return json({ user: null });

  const [saved, monitors] = await env.DB.batch([
    env.DB.prepare('SELECT article_id FROM saved_articles WHERE user_id = ? ORDER BY saved_at DESC').bind(user.id),
    env.DB.prepare('SELECT id, name, countries, topics, keywords, created_at FROM monitors WHERE user_id = ? ORDER BY created_at').bind(user.id),
  ]);
  return json({
    user: publicUser(user),
    savedIds: saved.results.map((r) => r.article_id),
    monitors: monitors.results.map(shapeMonitor),
  });
}

export async function updateProfile(request, env) {
  const user = await requireUser(env.DB, request);
  const body = await readJson(request);
  const name = String(body.name || '').trim().replace(/\s+/g, ' ');
  if (!name || name.length > 80) throw new HttpError(400, 'Enter your name (up to 80 characters)');
  await env.DB.prepare('UPDATE users SET name = ? WHERE id = ?').bind(name, user.id).run();
  return json({ user: publicUser({ ...user, name }) });
}

export async function changePassword(request, env) {
  const user = await requireUser(env.DB, request);
  const { current, next } = await readJson(request);
  validateCredentials({ email: user.email, password: next });
  await rateLimit(env.DB, `password:${user.id}`, 10, 900);

  const row = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(user.id).first();
  if (!(await verifyPassword(String(current || ''), row.password_hash))) throw new HttpError(401, 'Your current password is not correct');

  // Changing the password signs out every other device.
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(await hashPassword(next), user.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
  ]);
  const cookie = await createSession(env.DB, user.id, request);
  return json({ ok: true }, { headers: { 'Set-Cookie': cookie } });
}

export async function deleteAccount(request, env) {
  const user = await requireUser(env.DB, request);
  const { password } = await readJson(request);
  const row = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(user.id).first();
  if (!(await verifyPassword(String(password || ''), row.password_hash))) throw new HttpError(401, 'Your password is not correct');
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id).run(); // cascades to sessions, saves, monitors
  return json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie(request) } });
}

// ── Saved stories ───────────────────────────────────────────────────────────

export async function getSaved(request, env) {
  const user = await requireUser(env.DB, request);
  const { results } = await env.DB
    .prepare('SELECT article_id FROM saved_articles WHERE user_id = ? ORDER BY saved_at DESC LIMIT 500')
    .bind(user.id)
    .all();
  const ids = results.map((r) => r.article_id);
  const articles = await getArticlesByIds(env.DB, ids);
  const order = new Map(ids.map((id, i) => [id, i]));
  return json({ items: articles.sort((a, b) => order.get(a.id) - order.get(b.id)) });
}

const articleIdFrom = (v) => {
  const id = Number(v);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid article id');
  return id;
};

export async function saveArticle(request, env) {
  const user = await requireUser(env.DB, request);
  const { articleId } = await readJson(request);
  await env.DB
    .prepare('INSERT OR IGNORE INTO saved_articles (user_id, article_id, saved_at) SELECT ?, id, ? FROM articles WHERE id = ?')
    .bind(user.id, now(), articleIdFrom(articleId))
    .run();
  return json({ ok: true });
}

export async function unsaveArticle(request, env, _ctx, { id }) {
  const user = await requireUser(env.DB, request);
  await env.DB.prepare('DELETE FROM saved_articles WHERE user_id = ? AND article_id = ?').bind(user.id, articleIdFrom(id)).run();
  return json({ ok: true });
}

// ── Monitors ────────────────────────────────────────────────────────────────

function shapeMonitor(r) {
  return { id: r.id, name: r.name, countries: JSON.parse(r.countries), topics: JSON.parse(r.topics), keywords: r.keywords, createdAt: r.created_at };
}

function cleanMonitor(input) {
  const countries = [...new Set((input.countries || []).filter((c) => /^[A-Z]{2}$/.test(c)))].slice(0, 54);
  const topics = [...new Set((input.topics || []).filter((t) => /^[a-z-]{2,30}$/.test(t)))].slice(0, 50);
  const keywords = String(input.keywords || '').slice(0, 300).trim();
  const name = String(input.name || '').trim().slice(0, 80);
  if (!name) throw new HttpError(400, 'Give your monitor a name');
  if (!countries.length && !topics.length && !keywords) throw new HttpError(400, 'Choose at least one country, topic or keyword');
  return { name, countries, topics, keywords };
}

const MAX_MONITORS = 100;

export async function createMonitor(request, env) {
  const user = await requireUser(env.DB, request);
  const m = cleanMonitor(await readJson(request));
  const { count } = await env.DB.prepare('SELECT COUNT(*) AS count FROM monitors WHERE user_id = ?').bind(user.id).first();
  if (count >= MAX_MONITORS) throw new HttpError(400, `You can keep up to ${MAX_MONITORS} monitors`);
  const row = await env.DB
    .prepare('INSERT INTO monitors (id, user_id, name, countries, topics, keywords, created_at) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *')
    .bind(crypto.randomUUID(), user.id, m.name, JSON.stringify(m.countries), JSON.stringify(m.topics), m.keywords, now())
    .first();
  return json({ monitor: shapeMonitor(row) }, { status: 201 });
}

export async function updateMonitor(request, env, _ctx, { id }) {
  const user = await requireUser(env.DB, request);
  const m = cleanMonitor(await readJson(request));
  const row = await env.DB
    .prepare('UPDATE monitors SET name = ?, countries = ?, topics = ?, keywords = ? WHERE id = ? AND user_id = ? RETURNING *')
    .bind(m.name, JSON.stringify(m.countries), JSON.stringify(m.topics), m.keywords, id, user.id)
    .first();
  if (!row) throw new HttpError(404, 'Monitor not found');
  return json({ monitor: shapeMonitor(row) });
}

export async function deleteMonitor(request, env, _ctx, { id }) {
  const user = await requireUser(env.DB, request);
  await env.DB.prepare('DELETE FROM monitors WHERE id = ? AND user_id = ?').bind(id, user.id).run();
  return json({ ok: true });
}

/** Merges what a reader collected anonymously (in this browser) into their account at sign-in. */
export async function importLocal(request, env) {
  const user = await requireUser(env.DB, request);
  const body = await readJson(request, 100_000);
  const savedIds = [...new Set((body.savedIds || []).map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 300);
  const t = now();

  const { results: existing } = await env.DB.prepare('SELECT name FROM monitors WHERE user_id = ?').bind(user.id).all();
  const names = new Set(existing.map((r) => r.name.toLowerCase()));
  const monitors = [];
  for (const raw of (body.monitors || []).slice(0, MAX_MONITORS - existing.length)) {
    try {
      const m = cleanMonitor(raw);
      if (!names.has(m.name.toLowerCase())) monitors.push(m);
    } catch { /* skip invalid entries */ }
  }

  const statements = [
    ...savedIds.map((id) =>
      env.DB.prepare('INSERT OR IGNORE INTO saved_articles (user_id, article_id, saved_at) SELECT ?, id, ? FROM articles WHERE id = ?').bind(user.id, t, id)),
    ...monitors.map((m) =>
      env.DB.prepare('INSERT INTO monitors (id, user_id, name, countries, topics, keywords, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), user.id, m.name, JSON.stringify(m.countries), JSON.stringify(m.topics), m.keywords, t)),
  ];
  if (statements.length) await env.DB.batch(statements);
  return getMe(request, env);
}
