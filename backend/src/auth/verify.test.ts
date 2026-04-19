// Acceptance Test
// Traces to: T-008
// Description: verifyEmail activates accounts; expired/reused tokens are rejected; resend works.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, createHash, randomUUID } from 'node:crypto';
import { verifyEmail, resendVerification } from './verify.ts';
import { InMemoryUserStore } from './user-store.ts';
import type { User } from './user-store.ts';
import type { Mailer } from './mailer.ts';
import { signupUser } from './signup.ts';

function fakeMailer(): { mailer: Mailer; sent: { email: string; token: string }[] } {
  const sent: { email: string; token: string }[] = [];
  return {
    sent,
    mailer: { sendVerification: (email, token) => { sent.push({ email, token }); return Promise.resolve(); }, sendReset: () => Promise.resolve(), sendInvite: () => Promise.resolve(), sendRejection: () => Promise.resolve(), sendChosenNotification: () => Promise.resolve() },
  };
}

test('verifyEmail activates user with valid token', async () => {
  const store = new InMemoryUserStore();
  const { mailer, sent } = fakeMailer();
  await signupUser('verify@example.com', 'ValidPass123!', { userStore: store, mailer });

  const result = await verifyEmail(sent[0].token, { userStore: store, mailer });
  assert.equal(result, 'ok');
  const user = await store.findByEmail('verify@example.com');
  assert.equal(user?.state, 'active');
});

test('verifyEmail rejects expired token', async () => {
  const store = new InMemoryUserStore();
  const { mailer } = fakeMailer();
  const user: User = {
    id: randomUUID(), email: 'exp@example.com', passwordHash: 'x',
    state: 'pending_verification', createdAt: new Date(),
  };
  await store.create(user);
  const raw = randomBytes(32).toString('hex');
  await store.saveToken({
    userId: user.id,
    tokenHash: createHash('sha256').update(raw).digest('hex'),
    expiresAt: new Date(Date.now() - 1000),
  });
  const result = await verifyEmail(raw, { userStore: store, mailer });
  assert.equal(result, 'invalid');
  const stored = await store.findByEmail('exp@example.com');
  assert.equal(stored?.state, 'pending_verification');
});

test('verifyEmail rejects reused token', async () => {
  const store = new InMemoryUserStore();
  const { mailer, sent } = fakeMailer();
  await signupUser('reuse@example.com', 'ValidPass123!', { userStore: store, mailer });
  const token = sent[0].token;

  const first = await verifyEmail(token, { userStore: store, mailer });
  assert.equal(first, 'ok');

  const second = await verifyEmail(token, { userStore: store, mailer });
  assert.equal(second, 'invalid');
});

test('resendVerification sends new token and invalidates old one', async () => {
  const store = new InMemoryUserStore();
  const { mailer, sent } = fakeMailer();
  await signupUser('resend@example.com', 'ValidPass123!', { userStore: store, mailer });
  const oldToken = sent[0].token;

  await resendVerification('resend@example.com', { userStore: store, mailer });
  const newToken = sent[1].token;

  assert.notEqual(oldToken, newToken);

  const oldResult = await verifyEmail(oldToken, { userStore: store, mailer });
  assert.equal(oldResult, 'invalid', 'old token should be invalidated after resend');

  const newResult = await verifyEmail(newToken, { userStore: store, mailer });
  assert.equal(newResult, 'ok');
});

test('resendVerification is silent for unknown email', async () => {
  const store = new InMemoryUserStore();
  const { mailer, sent } = fakeMailer();
  await resendVerification('ghost@example.com', { userStore: store, mailer });
  assert.equal(sent.length, 0);
});
