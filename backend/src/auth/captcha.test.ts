// Acceptance Test
// Traces to: T-047
// Description: CAPTCHA enforcement on signup and review creation — missing/rejected token → 400; valid token → proceeds.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createSignupHandler } from './signup.ts';
import { InMemoryUserStore } from './user-store.ts';
import type { Mailer } from './mailer.ts';
import type { CaptchaVerifier } from './captcha.ts';

const noopMailer: Mailer = {
  sendVerification: async () => void 0,
  sendReset: async () => void 0,
  sendInvite: async () => void 0,
  sendRejection: async () => void 0,
  sendChosenNotification: async () => void 0,
  sendDeletionConfirmation: async () => void 0,
};

function makeReq(body: Record<string, unknown>): IncomingMessage {
  const stream = new PassThrough() as unknown as IncomingMessage;
  (stream as unknown as { headers: unknown })['headers'] = { 'content-type': 'application/json' };
  (stream as unknown as { method: unknown })['method'] = 'POST';
  (stream as unknown as { url: unknown })['url'] = '/';
  setImmediate(() => {
    (stream as unknown as PassThrough).push(JSON.stringify(body));
    (stream as unknown as PassThrough).push(null);
  });
  return stream;
}

interface MockRes {
  writeHead(code: number, headers?: Record<string, string>): void;
  end(data?: string): void;
  status: number;
}

function makeRes(): MockRes & ServerResponse {
  const m: MockRes = { status: 0, writeHead(c) { m.status = c; }, end() { return undefined; } };
  return m as unknown as MockRes & ServerResponse;
}

const passVerifier: CaptchaVerifier = { verify: async () => ({ success: true }) };
const failVerifier: CaptchaVerifier = { verify: async () => ({ success: false }) };

test('signup: missing captchaToken when verifier provided → 400', async () => {
  const handler = createSignupHandler({ userStore: new InMemoryUserStore(), mailer: noopMailer, captchaVerifier: passVerifier });
  const res = makeRes();
  await handler(makeReq({ email: 'test@example.com', password: 'ValidPass123!' }), res);
  assert.equal(res.status, 400);
});

test('signup: rejected captchaToken → 400', async () => {
  const handler = createSignupHandler({ userStore: new InMemoryUserStore(), mailer: noopMailer, captchaVerifier: failVerifier });
  const res = makeRes();
  await handler(makeReq({ email: 'test@example.com', password: 'ValidPass123!', captchaToken: 'bad' }), res);
  assert.equal(res.status, 400);
});

test('signup: valid captchaToken → 200', async () => {
  const handler = createSignupHandler({ userStore: new InMemoryUserStore(), mailer: noopMailer, captchaVerifier: passVerifier });
  const res = makeRes();
  await handler(makeReq({ email: 'test@example.com', password: 'ValidPass123!', captchaToken: 'good' }), res);
  assert.equal(res.status, 200);
});

test('signup: no captchaVerifier provided → proceeds without token', async () => {
  const handler = createSignupHandler({ userStore: new InMemoryUserStore(), mailer: noopMailer });
  const res = makeRes();
  await handler(makeReq({ email: 'test@example.com', password: 'ValidPass123!' }), res);
  assert.equal(res.status, 200);
});
