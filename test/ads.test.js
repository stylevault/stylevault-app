import test from 'node:test';
import assert from 'node:assert/strict';
import { adminCreateAd } from '../src/api/ads.js';
import { adminCreateArticle } from '../src/api/admin.js';

test('adminCreateAd rejects invalid ad type or missing required fields', async () => {
  const env = {
    ADMIN_TOKEN: 'secret-token-123',
    DB: {
      prepare: () => ({
        bind: () => ({
          run: async () => ({}),
        }),
        run: async () => ({}),
      }),
    },
  };

  // Missing title & sponsor
  const req1 = new Request('https://stylevault.app/api/admin/ads', {
    method: 'POST',
    headers: { 'X-Admin-Key': 'secret-token-123' },
    body: JSON.stringify({ type: 'banner' }),
  });
  await assert.rejects(async () => {
    await adminCreateAd(req1, env);
  }, { status: 400 });

  // Invalid type
  const req2 = new Request('https://stylevault.app/api/admin/ads', {
    method: 'POST',
    headers: { 'X-Admin-Key': 'secret-token-123' },
    body: JSON.stringify({ type: 'popup', title: 'Ad', sponsor: 'Sponsor', linkUrl: 'https://example.com' }),
  });
  await assert.rejects(async () => {
    await adminCreateAd(req2, env);
  }, { status: 400 });

  // Missing https URL
  const req3 = new Request('https://stylevault.app/api/admin/ads', {
    method: 'POST',
    headers: { 'X-Admin-Key': 'secret-token-123' },
    body: JSON.stringify({ type: 'banner', title: 'Ad', sponsor: 'Sponsor', linkUrl: 'not-a-url' }),
  });
  await assert.rejects(async () => {
    await adminCreateAd(req3, env);
  }, { status: 400 });
});

test('adminCreateArticle rejects missing headline', async () => {
  const env = {
    ADMIN_TOKEN: 'secret-token-123',
    DB: {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
          run: async () => ({ meta: { last_row_id: 10 } }),
        }),
      }),
    },
  };

  const req = new Request('https://stylevault.app/api/admin/articles', {
    method: 'POST',
    headers: { 'X-Admin-Key': 'secret-token-123' },
    body: JSON.stringify({ summary: 'Just summary without title' }),
  });

  await assert.rejects(async () => {
    await adminCreateArticle(req, env);
  }, { status: 400 });
});

test('adminCreateArticle publishes long-form HTML article with targetScope = everyone', async () => {
  let insertedData = null;
  const env = {
    ADMIN_TOKEN: 'secret-token-123',
    DB: {
      prepare: (sql) => ({
        bind: (...args) => ({
          first: async () => ({ id: 1, name: 'StyleVault Editorial' }),
          run: async () => {
            if (sql.includes('INSERT INTO articles')) {
              insertedData = args;
            }
            return { meta: { last_row_id: 42 } };
          },
        }),
        run: async () => ({}),
      }),
    },
  };

  const req = new Request('https://stylevault.app/api/admin/articles', {
    method: 'POST',
    headers: { 'X-Admin-Key': 'secret-token-123' },
    body: JSON.stringify({
      title: 'Pan-African Digital Trade Breakthrough',
      summary: 'AfCFTA unveils the continent-wide digital settlement infrastructure.',
      contentHtml: '<h2>Major Milestone</h2><p>The new payment network connects 54 central banks.</p>',
      targetScope: 'everyone',
    }),
  });

  const res = await adminCreateArticle(req, env);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.article.id, 42);
  assert.equal(data.article.targetScope, 'everyone');
  assert.equal(data.article.url, '/article/42');
  assert.equal(data.article.contentHtml.includes('Major Milestone'), true);
});

test('adminCreateAd accepts html code and custom target_pages', async () => {
  let insertedAd = null;
  const env = {
    ADMIN_TOKEN: 'secret-token-123',
    DB: {
      prepare: (sql) => ({
        bind: (...args) => ({
          run: async () => {
            if (sql.includes('INSERT INTO ads')) {
              insertedAd = args;
            }
            return {};
          },
        }),
        run: async () => ({}),
      }),
    },
  };

  const req = new Request('https://stylevault.app/api/admin/ads', {
    method: 'POST',
    headers: { 'X-Admin-Key': 'secret-token-123' },
    body: JSON.stringify({
      type: 'banner',
      sourceType: 'html',
      title: 'Google AdSense Strip',
      sponsor: 'Google Network',
      htmlCode: '<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-xxx"></ins>',
      targetPages: '/news,/topics,/countries',
    }),
  });

  const res = await adminCreateAd(req, env);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.ad.targetPages, '/news,/topics,/countries');
  assert.equal(data.ad.sourceType, 'html');
});


