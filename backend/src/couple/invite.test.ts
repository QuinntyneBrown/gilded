// Acceptance Test
// Traces to: T-016
// Description: Spouse invite send + accept; already-coupled and self-invite are rejected; expired token rejected.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { sendInvite, acceptInvite } from './invite.ts';
import { InMemoryUserStore } from '../auth/user-store.ts';
import { InMemorySessionStore } from '../auth/session-store.ts';
import { InMemoryCoupleStore } from './couple-store.ts';
import { signupUser } from '../auth/signup.ts';
import { verifyEmail } from '../auth/verify.ts';
import { loginUser } from '../auth/login.ts';
import type { Mailer } from '../auth/mailer.ts';

const PASSWORD = 'ValidPass123!';

function fakeMailer(): { mailer: Mailer; sent: { email: string; token: string }[] } {
  const sent: { email: string; token: string }[] = [];
  return {
    sent,
    mailer: {
      sendVerification: (email, token) => { sent.push({ email, token }); return Promise.resolve(); },
      sendReset: () => Promise.resolve(),
      sendInvite: (email, token) => { sent.push({ email, token }); return Promise.resolve(); },
      sendRejection: () => Promise.resolve(), sendChosenNotification: () => Promise.resolve(), sendDeletionConfirmation: () => Promise.resolve(),
    },
  };
}

async function setupActiveUser(email: string, store: InMemoryUserStore, sessionStore: InMemorySessionStore) {
  const { mailer, sent } = fakeMailer();
  await signupUser(email, PASSWORD, { userStore: store, mailer });
  await verifyEmail(sent[0].token, { userStore: store, mailer });
  const r = await loginUser(email, PASSWORD, { userStore: store, sessionStore });
  if (r.outcome !== 'ok') throw new Error('login failed');
  return (await store.findByEmail(email))!;
}

test('sendInvite creates invite and fires email', async () => {
  const store = new InMemoryUserStore();
  const sessionStore = new InMemorySessionStore();
  const coupleStore = new InMemoryCoupleStore();
  const { mailer, sent } = fakeMailer();

  const inviter = await setupActiveUser('inviter@example.com', store, sessionStore);
  sent.length = 0;

  const result = await sendInvite(inviter.id, 'invitee@example.com', { userStore: store, coupleStore, mailer });
  assert.equal(result, 'ok');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].email, 'invitee@example.com');
});

test('sendInvite rejects self-invite', async () => {
  const store = new InMemoryUserStore();
  const sessionStore = new InMemorySessionStore();
  const coupleStore = new InMemoryCoupleStore();
  const { mailer } = fakeMailer();

  const inviter = await setupActiveUser('self@example.com', store, sessionStore);
  const result = await sendInvite(inviter.id, 'self@example.com', { userStore: store, coupleStore, mailer });
  assert.equal(result, 'self_invite');
});

test('acceptInvite links both users with shared coupleId', async () => {
  const store = new InMemoryUserStore();
  const sessionStore = new InMemorySessionStore();
  const coupleStore = new InMemoryCoupleStore();
  const { mailer, sent } = fakeMailer();

  const inviter = await setupActiveUser('inviter2@example.com', store, sessionStore);
  sent.length = 0;
  await sendInvite(inviter.id, 'invitee2@example.com', { userStore: store, coupleStore, mailer });
  const inviteToken = sent[0].token;

  const invitee = await setupActiveUser('invitee2@example.com', store, sessionStore);
  const result = await acceptInvite(inviteToken, invitee.id, { userStore: store, coupleStore });
  assert.equal(result, 'ok');

  const updatedInviter = await store.findById(inviter.id);
  const updatedInvitee = await store.findByEmail('invitee2@example.com');
  assert.ok(updatedInviter!.coupleId, 'inviter should have coupleId');
  assert.equal(updatedInviter!.coupleId, updatedInvitee!.coupleId, 'both share coupleId');
  assert.equal(updatedInviter!.spouseId, updatedInvitee!.id);
  assert.equal(updatedInvitee!.spouseId, updatedInviter!.id);
});

test('acceptInvite rejects expired token', async () => {
  const store = new InMemoryUserStore();
  const sessionStore = new InMemorySessionStore();
  const coupleStore = new InMemoryCoupleStore();
  const inviter = await setupActiveUser('inv-exp@example.com', store, sessionStore);
  const invitee = await setupActiveUser('inv-exp2@example.com', store, sessionStore);

  const raw = randomBytes(32).toString('hex');
  await coupleStore.saveInvite({
    id: 'test-id',
    inviterId: inviter.id,
    inviteeEmail: 'inv-exp2@example.com',
    tokenHash: createHash('sha256').update(raw).digest('hex'),
    expiresAt: new Date(Date.now() - 1000),
  });

  const result = await acceptInvite(raw, invitee.id, { userStore: store, coupleStore });
  assert.equal(result, 'invalid');
});

test('sendInvite rejects already-coupled inviter', async () => {
  const store = new InMemoryUserStore();
  const sessionStore = new InMemorySessionStore();
  const coupleStore = new InMemoryCoupleStore();
  const { mailer, sent } = fakeMailer();

  const inviter = await setupActiveUser('coupled-inv@example.com', store, sessionStore);
  const invitee = await setupActiveUser('coupled-inv2@example.com', store, sessionStore);
  sent.length = 0;

  await sendInvite(inviter.id, 'coupled-inv2@example.com', { userStore: store, coupleStore, mailer });
  await acceptInvite(sent[0].token, invitee.id, { userStore: store, coupleStore });

  const result = await sendInvite(inviter.id, 'someone@example.com', { userStore: store, coupleStore, mailer });
  assert.equal(result, 'already_coupled');
});
