// Acceptance Test
// Traces to: T-007
// Description: signupUser hashes passwords, stores pending_verification users, prevents enumeration.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signupUser, validatePassword } from './signup.ts';
import { InMemoryUserStore } from './user-store.ts';
import type { Mailer } from './mailer.ts';

function fakeMailer(): { mailer: Mailer; sent: string[] } {
  const sent: string[] = [];
  return {
    sent,
    mailer: { sendVerification: (email) => { sent.push(email); return Promise.resolve(); }, sendReset: () => Promise.resolve(), sendInvite: () => Promise.resolve(), sendRejection: () => Promise.resolve() },
  };
}

test('validatePassword rejects password shorter than 12 chars', () => {
  assert.equal(validatePassword('Ab1!short'), false);
});

test('validatePassword rejects password without uppercase', () => {
  assert.equal(validatePassword('validpass123!'), false);
});

test('validatePassword rejects password without digit', () => {
  assert.equal(validatePassword('ValidPassWord!'), false);
});

test('validatePassword rejects password without symbol', () => {
  assert.equal(validatePassword('ValidPass1234'), false);
});

test('validatePassword accepts policy-compliant password', () => {
  assert.equal(validatePassword('ValidPass123!'), true);
});

test('signupUser stores user in pending_verification state', async () => {
  const store = new InMemoryUserStore();
  const { mailer, sent } = fakeMailer();

  await signupUser('User@Example.COM', 'ValidPass123!', { userStore: store, mailer });

  const user = await store.findByEmail('user@example.com');
  assert.ok(user, 'user should be stored');
  assert.equal(user.state, 'pending_verification');
  assert.equal(sent[0], 'user@example.com');
  assert.ok(!user.passwordHash.includes('ValidPass'), 'password must be hashed');
});

test('signupUser normalizes email to lowercase', async () => {
  const store = new InMemoryUserStore();
  const { mailer } = fakeMailer();
  await signupUser('UPPER@EXAMPLE.COM', 'ValidPass123!', { userStore: store, mailer });
  const user = await store.findByEmail('upper@example.com');
  assert.ok(user);
  assert.equal(user.email, 'upper@example.com');
});

test('signupUser silently ignores duplicate email', async () => {
  const store = new InMemoryUserStore();
  const { mailer, sent } = fakeMailer();
  await signupUser('dup@example.com', 'ValidPass123!', { userStore: store, mailer });
  await signupUser('dup@example.com', 'AnotherValid123!', { userStore: store, mailer });
  assert.equal(sent.length, 1, 'verification email sent only once');
});
