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
