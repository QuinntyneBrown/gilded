// Unit Test
// Traces to: T-039
// Description: NoteCrypto encrypt/decrypt round-trip; ciphertext never contains plaintext; different owners → different ciphertext.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NoteCrypto } from './note-crypto.ts';

const MASTER = 'a'.repeat(64); // 32-byte hex master key
const crypto = new NoteCrypto(MASTER);

test('encrypt/decrypt round-trip for private (per-user) scope', () => {
  const plaintext = 'This is my private note about the session.';
  const { ciphertext, iv, keyId } = crypto.encrypt(plaintext, 'user-abc');
  const decrypted = crypto.decrypt({ ciphertext, iv, keyId });
  assert.equal(decrypted, plaintext);
});

test('encrypt/decrypt round-trip for spouse (per-couple) scope', () => {
  const plaintext = 'Shared note for our couple.';
  const { ciphertext, iv, keyId } = crypto.encrypt(plaintext, 'couple-xyz');
  const decrypted = crypto.decrypt({ ciphertext, iv, keyId });
  assert.equal(decrypted, plaintext);
});

test('raw ciphertext does not contain plaintext substring', () => {
  const plaintext = 'super secret content 12345';
  const { ciphertext } = crypto.encrypt(plaintext, 'user-def');
  assert.ok(!Buffer.from(ciphertext, 'base64').toString('utf8').includes('super secret'));
  assert.ok(!ciphertext.includes('super secret'));
});

test('two different keyIds produce different ciphertext for same plaintext', () => {
  const plaintext = 'identical content for two users';
  const { ciphertext: c1 } = crypto.encrypt(plaintext, 'user-111');
  const { ciphertext: c2 } = crypto.encrypt(plaintext, 'user-222');
  assert.notEqual(c1, c2);
});

test('same keyId always decrypts correctly regardless of IV uniqueness', () => {
  const plaintext = 'consistent encryption';
  const enc1 = crypto.encrypt(plaintext, 'user-stable');
  const enc2 = crypto.encrypt(plaintext, 'user-stable');
  assert.equal(crypto.decrypt(enc1), plaintext);
  assert.equal(crypto.decrypt(enc2), plaintext);
  assert.notEqual(enc1.iv, enc2.iv);
});

test('public notes are stored as plaintext (no-op crypto)', () => {
  const body = 'This note is public and readable by anyone.';
  const stored = crypto.storePublic(body);
  assert.equal(stored.body, body);
  assert.equal(stored.ciphertext, undefined);
});
