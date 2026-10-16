import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../src/lib/auth.js';

test('password hashing and verification works', async () => {
  const password = 'CorrectHorseBatteryStaple99!';
  const hash = await hashPassword(password);
  assert.ok(hash.startsWith('pbkdf2-sha256$'));
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword('WrongPassword123!', hash), false);
});

