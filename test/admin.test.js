import test from 'node:test';
import assert from 'node:assert/strict';
import { requireAdmin } from '../src/api/admin.js';

test('requireAdmin accepts ADMIN_TOKEN in Authorization header', async () => {
  const req = new Request('https://stylevault.app/api/admin/metrics', {
    headers: { 'Authorization': 'Bearer secret-token-123' },
  });
  const env = { ADMIN_TOKEN: 'secret-token-123' };
  const auth = await requireAdmin(req, env);
  assert.equal(auth.isAdmin, true);
  assert.equal(auth.via, 'token');
});

test('requireAdmin accepts ADMIN_TOKEN in X-Admin-Key header', async () => {
  const req = new Request('https://stylevault.app/api/admin/metrics', {
    headers: { 'X-Admin-Key': 'secret-token-123' },
  });
  const env = { ADMIN_TOKEN: 'secret-token-123' };
  const auth = await requireAdmin(req, env);
  assert.equal(auth.isAdmin, true);
});

test('requireAdmin rejects invalid or missing credentials', async () => {
  const req = new Request('https://stylevault.app/api/admin/metrics');
  const env = { ADMIN_TOKEN: 'secret-token-123' };
  await assert.rejects(async () => {
    await requireAdmin(req, env);
  }, { status: 401 });
});
