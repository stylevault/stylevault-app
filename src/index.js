/**
 * StyleVault Worker: JSON API under /api/*, scheduled news collection, and the
 * single-page app served from ./public via Workers Static Assets.
 */
import { HttpError, assertSameOrigin, json } from './lib/http.js';
import { getArticles, getCountry, getMeta, getSources, getTopStories, postCollect, postIndicators } from './api/public.js';
import * as account from './api/account.js';
import { pruneOldData, runCollection } from './collector/collect.js';
import { refreshIndicators, staleIndicators } from './collector/indicators.js';

const routes = [
  ['GET', '/api/meta', getMeta],
  ['GET', '/api/articles', getArticles],
  ['GET', '/api/top-stories', getTopStories],
  ['GET', '/api/sources', getSources],
  ['GET', '/api/countries/:code', getCountry],
  ['POST', '/api/admin/collect', postCollect],
  ['POST', '/api/admin/indicators', postIndicators],

  ['POST', '/api/auth/signup', account.signup],
  ['POST', '/api/auth/login', account.login],
  ['POST', '/api/auth/logout', account.logout],

  ['GET', '/api/me', account.getMe],
  ['PATCH', '/api/me', account.updateProfile],
  ['DELETE', '/api/me', account.deleteAccount],
  ['POST', '/api/me/password', account.changePassword],
  ['POST', '/api/me/import', account.importLocal],
  ['GET', '/api/me/saved', account.getSaved],
  ['POST', '/api/me/saved', account.saveArticle],
  ['DELETE', '/api/me/saved/:id', account.unsaveArticle],
  ['POST', '/api/me/monitors', account.createMonitor],
  ['PUT', '/api/me/monitors/:id', account.updateMonitor],
  ['DELETE', '/api/me/monitors/:id', account.deleteMonitor],
].map(([method, path, handler]) => ({
  method,
  handler,
  pattern: new RegExp(`^${path.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`),
}));

async function handleApi(request, env, ctx) {
  const { pathname } = new URL(request.url);
  let pathMatched = false;
  for (const route of routes) {
    const m = route.pattern.exec(pathname);
    if (!m) continue;
    pathMatched = true;
    if (route.method !== request.method) continue;
    if (request.method !== 'GET') assertSameOrigin(request);
    return route.handler(request, env, ctx, m.groups || {});
  }
  throw new HttpError(pathMatched ? 405 : 404, pathMatched ? 'Method not allowed' : 'Not found');
}

export default {
  async fetch(request, env, ctx) {
    env.DB = env.DB || env.stylevault;
    const { pathname } = new URL(request.url);
    if (!pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    try {
      return await handleApi(request, env, ctx);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, { status: err.status });
      console.error(JSON.stringify({ message: 'Unhandled API error', path: pathname, error: String(err?.stack || err) }));
      return json({ error: 'Something went wrong on our side. Please try again.' }, { status: 500 });
    }
  },

  async scheduled(controller, env, ctx) {
    env.DB = env.DB || env.stylevault;
    const at = new Date(controller.scheduledTime);

    // One slot an hour refreshes World Bank indicators (two at a time) instead of news,
    // so neither job pushes a run past the free plan's per-invocation limits.
    if (at.getUTCMinutes() >= 30 && at.getUTCMinutes() < 35) {
      const due = await staleIndicators(env, 2);
      if (due.length) {
        const summary = await refreshIndicators(env, { only: due });
        console.log(JSON.stringify({ message: 'Indicator refresh', due, ...summary }));
        return;
      }
    }

    const summary = await runCollection(env, { trigger: 'cron' });
    console.log(JSON.stringify({ message: 'Collection run', ...summary }));

    // Housekeeping once a day, in the 03:00 UTC slot.
    if (at.getUTCHours() === 3 && at.getUTCMinutes() < 10) ctx.waitUntil(pruneOldData(env));
  },
};
