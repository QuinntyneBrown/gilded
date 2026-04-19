// Acceptance Test
// Traces to: T-012
// Description: Password reset request is silent for unknown/unverified users; valid token + compliant password succeeds, invalidates sessions; expired and reused tokens are rejected.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { requestPasswordReset, completePasswordReset } from './reset.ts';
import { InMemoryUserStore } from './user-store.ts';
import { InMemorySessionStore } from './session-store.ts';
import { signupUser } from './signup.ts';
import { verifyEmail } from './verify.ts';
import { loginUser } from './login.ts';
import type { Mailer } from './mailer.ts';

const PASSWORD = 'ValidPass123!';

function fakeMailer(): { mailer: Mailer; sent: { email: string; token: string }[] } {
  const sent: { email: string; token: string }[] = [];
  return {
    sent,
    mailer: {
      sendVerification: (email, token) => { sent.push({ email, token }); return Promise.resolve(); },
      sendReset: (email, token) => { sent.push({ email, token }); return Promise.resolve(); },
      sendInvite: () => Promise.resolve(), sendRejection: () => Promise.resolve(),
    },
  };
}

async function setupActiveUser(email: string, store: InMemoryUserStore): Promise<void> {
  const { mailer, sent } = fakeMailer();
  await signupUser(email, PASSWORD, { userStore: store, mailer });
  await verifyEmail(sent[0].token, { userStore: store, mailer });
}

test('requestPasswordReset is silent for unknown email', async () => {
  const store = new InMemoryUserStore();
  const { mailer, sent } = fakeMailer();
  await requestPasswordReset('ghost@example.com', { userStore: store, mailer });
  assert.equal(sent.length, 0);
});

test('requestPasswordReset sends token for active user', async () => {
  const store = new InMemoryUserStore();
  const { mailer, sent } = fakeMailer();
  await setupActiveUser('reset-ok@example.com', store);
  sent.length = 0;

  await requestPasswordReset('reset-ok@example.com', { userStore: store, mailer });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].email, 'reset-ok@example.com');
  assert.ok(sent[0].token.length > 0);
});

test('completePasswordReset returns ok and invalidates sessions', async () => {
  const store = new InMemoryUserStore();
  const sessionStore = new InMemorySessionStore();
  const { mailer, sent } = fakeMailer();
  await setupActiveUser('reset-complete@example.com', store);

  await requestPasswordReset('reset-complete@example.com', { userStore: store, mailer });
  const resetToken = sent[sent.length - 1].token;

  const loginBefore = await loginUser('reset-complete@example.com', PASSWORD, { userStore: store, sessionStore });
  assert.equal(loginBefore.outcome, 'ok');

  const result = await completePasswordReset(resetToken, 'NewSecure456@', { userStore: store, sessionStore });
  assert.equal(result, 'ok');

  if (loginBefore.outcome === 'ok') {
    const session = await sessionStore.findById(loginBefore.sessionId);
    assert.equal(session, null, 'prior session should be invalidated');
  }

  const loginAfter = await loginUser('reset-complete@example.com', 'NewSecure456@', { userStore: store, sessionStore });
  assert.equal(loginAfter.outcome, 'ok', 'should login with new password');
});

test('completePasswordReset rejects expired token', async () => {
  const store = new InMemoryUserStore();
  const sessionStore = new InMemorySessionStore();
  await setupActiveUser('reset-expired@example.com', store);

  const user = await store.findByEmail('reset-expired@example.com');
  const raw = randomBytes(32).toString('hex');
  await store.saveResetToken({
    userId: user!.id,
    tokenHash: createHash('sha256').update(raw).digest('hex'),
    expiresAt: new Date(Date.now() - 1000),
  });

  const result = await completePasswordReset(raw, 'NewSecure456@', { userStore: store, sessionStore });
  assert.equal(result, 'invalid');
});

test('completePasswordReset rejects reused token', async () => {
  const store = new InMemoryUserStore();
  const sessionStore = new InMemorySessionStore();
  const { mailer, sent } = fakeMailer();
  await setupActiveUser('reset-reuse@example.com', store);

  await requestPasswordReset('reset-reuse@example.com', { userStore: store, mailer });
  const token = sent[sent.length - 1].token;

  await completePasswordReset(token, 'NewSecure456@', { userStore: store, sessionStore });
  const second = await completePasswordReset(token, 'NewSecure456@', { userStore: store, sessionStore });
  assert.equal(second, 'invalid');
});

test('completePasswordReset rejects weak password', async () => {
  const store = new InMemoryUserStore();
  const sessionStore = new InMemorySessionStore();
  const { mailer, sent } = fakeMailer();
  await setupActiveUser('reset-weak@example.com', store);

  await requestPasswordReset('reset-weak@example.com', { userStore: store, mailer });
  const token = sent[sent.length - 1].token;

  const result = await completePasswordReset(token, 'weak', { userStore: store, sessionStore });
  assert.equal(result, 'policy_violation');
});
