import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('WHOOP is an explicitly disabled-by-default integration with no exposed endpoints', () => {
  const code = src('lib/whoop/foundation.ts');
  assert.match(code, /process\.env\.WHOOP_ENABLED === 'true'/);
  assert.match(code, /if \(!whoopReady\(\)\) throw/);
  assert.match(code, /if \(!whoopEnabled\(\)\) throw/g);
  assert.equal(existsSync(new URL('../app/api/whoop', import.meta.url)), false,
    'offline foundation must not introduce public WHOOP routes');
});

test('WHOOP foundation contains only encrypted token storage primitives', () => {
  const code = src('lib/whoop/foundation.ts');
  assert.match(code, /createCipheriv\('aes-256-gcm'/);
  assert.match(code, /createDecipheriv\('aes-256-gcm'/);
  assert.match(code, /randomBytes\(12\)/);
  assert.match(code, /cipher\.getAuthTag\(\)/);
  assert.match(code, /decipher\.setAuthTag\(tag\)/);
  assert.match(code, /WHOOP_TOKEN_ENCRYPTION_KEY/);
});

test('future schema is user-owned, idempotent and intentionally not applied', () => {
  const migration = src('db/migrations/20261120_whoop_foundation_future.sql');
  assert.match(migration, /user_id uuid PRIMARY KEY REFERENCES public\.app_profiles\(id\)/);
  assert.match(migration, /state_sha256 char\(64\) PRIMARY KEY/);
  assert.match(migration, /UNIQUE \(user_id, provider, kind, external_id\)/);
  assert.match(migration, /encrypted_access_token text/);
  assert.match(migration, /encrypted_refresh_token text/);
  assert.doesNotMatch(migration, /\bGRANT\s+.*\bPUBLIC\b/i);
  assert.doesNotMatch(migration, /\bINSERT INTO\b/i);
});

test('no external API execution or sync job exists in offline foundation', () => {
  const code = src('lib/whoop/foundation.ts');
  assert.doesNotMatch(code, /\bfetch\(/);
  assert.doesNotMatch(code, /\bsetInterval\(/);
  assert.doesNotMatch(code, /\bcreateServer\(/);
});
