// Acceptance Test
// Traces to: T-009
// Description: loginUser issues sessions; wrong creds and unverified accounts are rejected; sliding expiration works.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loginUser, getSessionUser } from './login.ts';
import { InMemoryUserStore } from './user-store.ts';
import { InMemorySessionStore } from './session-store.ts';
import { signupUser } from './signup.ts';
import { verifyEmail } from './verify.ts';
import type { Mailer } from './mailer.ts';
import type { IncomingMessage } from 'node:http';

const PASSWORD = 'ValidPass123!';

function fakeMailer(): { mailer: Mailer; sent: { email: string; token: string }[] } {
  const sent: { email: string; token: string }[] = [];
  return {
    sent,
    mailer: { sendVerification: (email, token) => { sent.push({ email, token }); return Promise.resolve(); }, sendReset: () => Promise.resolve() },
  };
}

async function setupActiveUser(email: string): Promise<InMemoryUserStore> {
  const store = new InMemoryUserStore();
  const { mailer, sent } = fakeMailer();
  await signupUser(email, PASSWORD, { userStore: store, mailer });
  await verifyEmail(sent[0].token, { userStore: store, mailer });
  return store;
}

test('loginUser returns ok with sessionId for valid active user', async () => {
  const store = await setupActiveUser('login-ok@example.com');
  const sessionStore = new InMemorySessionStore();

  const result = await loginUser('login-ok@example.com', PASSWORD, { userStore: store, sessionStore });
  assert.equal(result.outcome, 'ok');
  if (result.outcome !== 'ok') return;
  assert.ok(result.sessionId.length > 0);

  const session = await sessionStore.findById(result.sessionId);
  assert.ok(session !== null);
  assert.ok(session!.expiresAt > new Date());
});

test('loginUser returns invalid_credentials for wrong password', async () => {
  const store = await setupActiveUser('login-badpass@example.com');
  const sessionStore = new InMemorySessionStore();

  const result = await loginUser('login-badpass@example.com', 'WrongPass456@', { userStore: store, sessionStore });
  assert.equal(result.outcome, 'invalid_credentials');
});

test('loginUser returns invalid_credentials for unknown email', async () => {
  const store = new InMemoryUserStore();
  const sessionStore = new InMemorySessionStore();

  const result = await loginUser('nobody@example.com', PASSWORD, { userStore: store, sessionStore });
  assert.equal(result.outcome, 'invalid_credentials');
});

test('loginUser returns not_verified for pending_verification user', async () => {
  const store = new InMemoryUserStore();
  const { mailer } = fakeMailer();
  await signupUser('login-unverified@example.com', PASSWORD, { userStore: store, mailer });
  const sessionStore = new InMemorySessionStore();

  const result = await loginUser('login-unverified@example.com', PASSWORD, { userStore: store, sessionStore });
  assert.equal(result.outcome, 'not_verified');
});

test('getSessionUser slides session expiration on valid request', async () => {
  const store = await setupActiveUser('login-slide@example.com');
  const sessionStore = new InMemorySessionStore();

  const loginResult = await loginUser('login-slide@example.com', PASSWORD, { userStore: store, sessionStore });
  assert.equal(loginResult.outcome, 'ok');
  if (loginResult.outcome !== 'ok') return;

  const before = await sessionStore.findById(loginResult.sessionId);
  const beforeExpiry = before!.expiresAt.getTime();
  const beforeSeen = before!.lastSeenAt.getTime();

  await new Promise(r => setTimeout(r, 10));

  const fakeReq = { headers: { cookie: `sid=${loginResult.sessionId}` } } as unknown as IncomingMessage;
  const sessionUser = await getSessionUser(fakeReq, { userStore: store, sessionStore });
  assert.ok(sessionUser !== null);

  const after = await sessionStore.findById(loginResult.sessionId);
  assert.ok(after!.expiresAt.getTime() > beforeExpiry, 'expiry should slide forward');
  assert.ok(after!.lastSeenAt.getTime() > beforeSeen, 'lastSeenAt should advance');
});
