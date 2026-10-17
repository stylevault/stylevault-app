/**
 * StyleVault Worker: JSON API under /api/*, scheduled news collection, and the
 * single-page app served from ./public via Workers Static Assets.
 */
import { HttpError, assertSameOrigin, json } from './lib/http.js';
import { getArticleById, getArticles, getCountry, getMeta, getSources, getTopStories, postCollect, postIndicators } from './api/public.js';
import * as account from './api/account.js';
import * as admin from './api/admin.js';
import * as ads from './api/ads.js';
import { pruneOldData, runCollection } from './collector/collect.js';
import { refreshIndicators, staleIndicators } from './collector/indicators.js';

const routes = [
  ['GET', '/api/meta', getMeta],
  ['GET', '/api/articles', getArticles],
  ['GET', '/api/articles/:id', getArticleById],
  ['GET', '/api/top-stories', getTopStories],
  ['GET', '/api/sources', getSources],
  ['GET', '/api/countries/:code', getCountry],
  ['GET', '/api/ads', ads.getAds],
  ['POST', '/api/ads/:id/click', ads.trackAdClick],
  ['POST', '/api/ads/:id/impression', ads.trackAdImpression],

  ['GET', '/api/admin/metrics', admin.getAdminMetrics],
  ['POST', '/api/admin/collect', admin.postCollectAdmin],
  ['POST', '/api/admin/indicators', admin.postIndicatorsAdmin],
  ['POST', '/api/admin/articles', admin.adminCreateArticle],
  ['DELETE', '/api/admin/articles/:id', admin.adminDeleteArticle],
  ['GET', '/api/admin/ads', ads.adminGetAds],
  ['POST', '/api/admin/ads', ads.adminCreateAd],
  ['PATCH', '/api/admin/ads/:id', ads.adminUpdateAd],
  ['DELETE', '/api/admin/ads/:id', ads.adminDeleteAd],

  ['POST', '/api/auth/signup', account.signup],
  ['POST', '/api/auth/login', account.login],
  ['POST', '/api/auth/logout', account.logout],
  ['POST', '/api/auth/forgot-password', account.forgotPassword],
  ['POST', '/api/auth/reset-password', account.resetPassword],

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

const ROUTE_SEO = {
  '/': {
    title: 'Style Vault · Understand Africa, one country at a time',
    desc: 'Country files, verified research and news reporting on all 54 African countries, with every figure cited and every story linked to its primary source. A Ria’s Colony product.',
  },
  '/countries': {
    title: 'All 54 African Countries · Style Vault Directory',
    desc: 'Browse country files, economic indicators, and news from all 54 African nations across North, West, Central, East, and Southern Africa.',
  },
  '/research': {
    title: 'African Research & Policy Papers · Style Vault',
    desc: 'Curated research, policy briefs, and economic analyses from African central banks, universities, think tanks, and development organizations.',
  },
  '/news': {
    title: 'African News Wire · Style Vault',
    desc: 'Real-time reporting from newsrooms across all 54 African countries, categorized by topic and cited to original publishers.',
  },
  '/topics': {
    title: 'Topics & African Industry Sectors · Style Vault',
    desc: 'Explore reporting and research across African economies, agriculture, technology, mining, energy, politics, and culture.',
  },
  '/tools': {
    title: 'African Travel & Commerce Tools · Style Vault',
    desc: 'Essential tools for traveling and doing business in Africa: Women’s Safety, Travel Checklists, Currency Converter, Customs Guides, and Time Zones.',
  },
  '/about': {
    title: 'About Style Vault · Ria’s Colony Product',
    desc: 'Style Vault is an open public record of African life and commerce, providing verified data, news, and tools for traveling and working in Africa.',
  },
  '/sources': {
    title: 'Sources & Methodology · Style Vault',
    desc: 'Complete directory of 90+ African newsrooms, institutional publishers, and World Bank indicators monitored by Style Vault with collection methodology.',
  },
  '/privacy': {
    title: 'Privacy Policy · Style Vault',
    desc: 'Style Vault privacy practices: zero third-party tracking, open public access, and strict data protection standards.',
  },
  '/directory': {
    title: 'Directory · Countries & Topics · Style Vault',
    desc: 'Browse African intelligence by geographic country files across all 54 nations, or follow strategic industry sectors.',
  },
  '/explore': {
    title: 'Directory · Countries & Topics · Style Vault',
    desc: 'Browse African intelligence by geographic country files across all 54 nations, or follow strategic industry sectors.',
  },
  '/admin': {
    title: 'Admin Analytics & Data · Style Vault',
    desc: 'Style Vault platform metrics, user analytics, ingestion health, and newsroom monitoring.',
  },
};

function getSeoMeta(pathname) {
  if (ROUTE_SEO[pathname]) return ROUTE_SEO[pathname];
  if (pathname.startsWith('/country/')) {
    const slug = pathname.replace('/country/', '').replace(/\/$/, '');
    const clean = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      title: `${clean} · Style Vault Country File`,
      desc: `Country file, verified reporting and economic indicators for ${clean}. All figures cited and stories linked to original publishers. A Ria’s Colony product.`,
    };
  }
  if (pathname.startsWith('/topic/')) {
    const slug = pathname.replace('/topic/', '').replace(/\/$/, '');
    const clean = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      title: `${clean} in Africa · Style Vault`,
      desc: `Verified reporting, policy papers, and economic analysis on ${clean.toLowerCase()} across African economies and institutions.`,
    };
  }
  if (pathname.startsWith('/tools/')) {
    const tool = pathname.replace('/tools/', '').replace(/\/$/, '');
    const clean = tool.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      title: `${clean} · Style Vault Tools`,
      desc: `Interactive travel and business tool: ${clean.toLowerCase()} for travelers, professionals, and cross-border commerce across African countries.`,
    };
  }
  return null;
}

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
    if (!pathname.startsWith('/api/')) {
      const response = await env.ASSETS.fetch(request);
      const ct = response.headers.get('content-type') || '';
      if (ct.includes('text/html')) {
        const seo = getSeoMeta(pathname);
        let res = response;
        if (seo) {
          const canonical = new URL(pathname, 'https://stylevault.app').href;
          res = new HTMLRewriter()
            .on('title', { element(e) { e.setInnerContent(seo.title); } })
            .on('meta[name="description"]', { element(e) { e.setAttribute('content', seo.desc); } })
            .on('meta[property="og:title"]', { element(e) { e.setAttribute('content', seo.title); } })
            .on('meta[property="og:description"]', { element(e) { e.setAttribute('content', seo.desc); } })
            .on('meta[property="og:url"]', { element(e) { e.setAttribute('content', canonical); } })
            .on('meta[name="twitter:title"]', { element(e) { e.setAttribute('content', seo.title); } })
            .on('meta[name="twitter:description"]', { element(e) { e.setAttribute('content', seo.desc); } })
            .on('link[rel="canonical"]', { element(e) { e.setAttribute('href', canonical); } })
            .transform(response);
        }
        const headers = new Headers(res.headers);
        headers.set(
          'Content-Security-Policy',
          "default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; script-src-elem 'self' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' https: data:; connect-src 'self' https://cloudflareinsights.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
        );
        return new Response(res.body, {
          status: res.status,
          statusText: res.statusText,
          headers,
        });
      }
      return response;
    }

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
