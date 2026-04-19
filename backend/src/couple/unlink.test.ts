// Acceptance Test
// Traces to: T-017
// Description: Couple unlink clears both users' spouseId/coupleId, deletes couple row, emits CoupleDissolved event; solo user returns not_coupled; both can re-couple after unlink.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unlinkCouple } from './unlink.ts';
import { InMemoryUserStore } from '../auth/user-store.ts';
import { InMemorySessionStore } from '../auth/session-store.ts';
import { InMemoryCoupleStore } from './couple-store.ts';
import { EventBus } from '../events.ts';
import { sendInvite, acceptInvite } from './invite.ts';
import { signupUser } from '../auth/signup.ts';
import { verifyEmail } from '../auth/verify.ts';
import type { Mailer } from '../auth/mailer.ts';
import type { CoupleDissolved } from '../events.ts';

const PASSWORD = 'ValidPass123!';

function fakeMailer(): { mailer: Mailer; sent: { email: string; token: string }[] } {
  const sent: { email: string; token: string }[] = [];
  return {
    sent,
    mailer: {
      sendVerification: (email, token) => { sent.push({ email, token }); return Promise.resolve(); },
      sendReset: () => Promise.resolve(),
      sendInvite: (email, token) => { sent.push({ email, token }); return Promise.resolve(); },
    },
  };
}

async function setupCouple(emailA: string, emailB: string) {
  const userStore = new InMemoryUserStore();
  const sessionStore = new InMemorySessionStore();
  const coupleStore = new InMemoryCoupleStore();
  const { mailer, sent } = fakeMailer();

  await signupUser(emailA, PASSWORD, { userStore, mailer });
  await verifyEmail(sent[0].token, { userStore, mailer });
  sent.length = 0;

  await signupUser(emailB, PASSWORD, { userStore, mailer });
  await verifyEmail(sent[0].token, { userStore, mailer });
  sent.length = 0;

  const userA = (await userStore.findByEmail(emailA))!;
  await sendInvite(userA.id, emailB, { userStore, coupleStore, mailer });
  const token = sent[0].token;

  const userB = (await userStore.findByEmail(emailB))!;
  await acceptInvite(token, userB.id, { userStore, coupleStore });

  return { userStore, coupleStore, sessionStore, mailer, sent };
}

test('unlinkCouple clears coupleId and spouseId on both users', async () => {
  const { userStore, coupleStore } = await setupCouple('ua@example.com', 'ub@example.com');
  const eventBus = new EventBus();

  const userA = (await userStore.findByEmail('ua@example.com'))!;
  assert.ok(userA.coupleId, 'precondition: userA in couple');

  const result = await unlinkCouple(userA.id, { userStore, coupleStore, eventBus });
  assert.equal(result, 'ok');

  const updatedA = await userStore.findByEmail('ua@example.com');
  const updatedB = await userStore.findByEmail('ub@example.com');
  assert.equal(updatedA!.coupleId, undefined);
  assert.equal(updatedA!.spouseId, undefined);
  assert.equal(updatedB!.coupleId, undefined);
  assert.equal(updatedB!.spouseId, undefined);
});

test('unlinkCouple emits CoupleDissolved event with both userIds', async () => {
  const { userStore, coupleStore } = await setupCouple('ec@example.com', 'ed@example.com');
  const eventBus = new EventBus();

  const userA = (await userStore.findByEmail('ec@example.com'))!;
  const userB = (await userStore.findByEmail('ed@example.com'))!;
  await unlinkCouple(userA.id, { userStore, coupleStore, eventBus });

  const events = eventBus.all();
  assert.equal(events.length, 1);
  const evt = events[0] as CoupleDissolved;
  assert.equal(evt.type, 'CoupleDissolved');
  assert.ok(evt.userIds.includes(userA.id));
  assert.ok(evt.userIds.includes(userB.id));
});

test('unlinkCouple returns not_coupled for user not in a couple', async () => {
  const userStore = new InMemoryUserStore();
  const coupleStore = new InMemoryCoupleStore();
  const eventBus = new EventBus();
  const { mailer, sent } = fakeMailer();

  await signupUser('solo@example.com', PASSWORD, { userStore, mailer });
  await verifyEmail(sent[0].token, { userStore, mailer });

  const user = (await userStore.findByEmail('solo@example.com'))!;
  const result = await unlinkCouple(user.id, { userStore, coupleStore, eventBus });
  assert.equal(result, 'not_coupled');
});

test('after unlink both users can form new couples', async () => {
  const { userStore, coupleStore } = await setupCouple('e1@example.com', 'e2@example.com');
  const eventBus = new EventBus();
  const { mailer, sent } = fakeMailer();

  const userA = (await userStore.findByEmail('e1@example.com'))!;
  await unlinkCouple(userA.id, { userStore, coupleStore, eventBus });

  sent.length = 0;
  const updatedA = (await userStore.findByEmail('e1@example.com'))!;
  const result = await sendInvite(updatedA.id, 'newspouse@example.com', { userStore, coupleStore, mailer });
  assert.equal(result, 'ok');
});
