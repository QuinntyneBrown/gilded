import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import { createSignupHandler } from './auth/signup.ts';
import { createVerifyHandler, createResendHandler } from './auth/verify.ts';
import { InMemoryUserStore } from './auth/user-store.ts';
import { NodemailerMailer } from './auth/mailer.ts';
import type { Mailer } from './auth/mailer.ts';

const CAPTURE = process.env['CAPTURE_EMAILS'] === '1';
const emailLog: { email: string; token: string }[] = [];

function buildMailer(): Mailer {
  const base = new NodemailerMailer();
  if (!CAPTURE) return base;
  return {
    sendVerification: async (email, token) => {
      emailLog.push({ email, token });
    },
  };
}

const deps = { userStore: new InMemoryUserStore(), mailer: buildMailer() };
const signupHandler = createSignupHandler(deps);
const verifyHandler = createVerifyHandler(deps);
const resendHandler = createResendHandler(deps);

export function handler(req: IncomingMessage, res: ServerResponse): void {
  const path = new URL(req.url ?? '', 'http://x').pathname;

  if (req.method === 'GET' && path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }
  if (req.method === 'POST' && path === '/api/auth/signup') {
    signupHandler(req, res).catch(err => { console.error(err); res.writeHead(500); res.end(); });
    return;
  }
  if (req.method === 'GET' && path === '/api/auth/verify') {
    verifyHandler(req, res).catch(err => { console.error(err); res.writeHead(500); res.end(); });
    return;
  }
  if (req.method === 'POST' && path === '/api/auth/resend-verification') {
    resendHandler(req, res).catch(err => { console.error(err); res.writeHead(500); res.end(); });
    return;
  }
  if (CAPTURE && req.method === 'GET' && path === '/api/dev/last-token') {
    const email = new URL(req.url ?? '', 'http://x').searchParams.get('email') ?? '';
    const last = [...emailLog].reverse().find(e => e.email === email);
    res.writeHead(last ? 200 : 404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(last ?? { error: 'not found' }));
    return;
  }
  res.writeHead(404);
  res.end();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createServer(handler).listen(3000);
}
