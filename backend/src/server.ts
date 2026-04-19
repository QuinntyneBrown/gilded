import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import { createSignupHandler } from './auth/signup.ts';
import { createVerifyHandler, createResendHandler } from './auth/verify.ts';
import { createLoginHandler, createMeHandler } from './auth/login.ts';
import { InMemoryUserStore } from './auth/user-store.ts';
import { InMemorySessionStore } from './auth/session-store.ts';
import { LoginRateLimiter } from './auth/rate-limit.ts';
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

const userStore = new InMemoryUserStore();
const sessionStore = new InMemorySessionStore();
const authDeps = { userStore, mailer: buildMailer() };
const sessionDeps = { userStore, sessionStore };

const signupHandler = createSignupHandler(authDeps);
const verifyHandler = createVerifyHandler(authDeps);
const resendHandler = createResendHandler(authDeps);
const loginHandler = createLoginHandler(sessionDeps, new LoginRateLimiter());
const meHandler = createMeHandler(sessionDeps);

export function handler(req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url ?? '', 'http://x');
  const path = url.pathname;

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
  if (req.method === 'POST' && path === '/api/auth/login') {
    loginHandler(req, res).catch(err => { console.error(err); res.writeHead(500); res.end(); });
    return;
  }
  if (req.method === 'GET' && path === '/api/auth/me') {
    meHandler(req, res).catch(err => { console.error(err); res.writeHead(500); res.end(); });
    return;
  }
  if (CAPTURE && req.method === 'GET' && path === '/api/dev/last-token') {
    const email = url.searchParams.get('email') ?? '';
    const last = [...emailLog].reverse().find(e => e.email === email);
    res.writeHead(last ? 200 : 404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(last ?? { error: 'not found' }));
    return;
  }
  if (CAPTURE && req.method === 'GET' && path === '/api/dev/session') {
    const sid = url.searchParams.get('sid') ?? '';
    sessionStore.findById(sid).then(session => {
      res.writeHead(session ? 200 : 404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(session ?? { error: 'not found' }));
    }).catch(err => { console.error(err); res.writeHead(500); res.end(); });
    return;
  }
  res.writeHead(404);
  res.end();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createServer(handler).listen(3000);
}
