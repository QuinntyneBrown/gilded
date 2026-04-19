import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import { createSignupHandler } from './auth/signup.ts';
import { createVerifyHandler, createResendHandler } from './auth/verify.ts';
import { createLoginHandler, createMeHandler } from './auth/login.ts';
import { createLogoutHandler } from './auth/logout.ts';
import { createResetRequestHandler, createResetCompleteHandler } from './auth/reset.ts';
import { createInviteHandler, createAcceptHandler } from './couple/invite.ts';
import { InMemoryUserStore } from './auth/user-store.ts';
import { InMemorySessionStore } from './auth/session-store.ts';
import { InMemoryCoupleStore } from './couple/couple-store.ts';
import { LoginRateLimiter } from './auth/rate-limit.ts';
import { NodemailerMailer } from './auth/mailer.ts';
import type { Mailer } from './auth/mailer.ts';

const CAPTURE = process.env['CAPTURE_EMAILS'] === '1';
const captureLog: { email: string; token: string }[] = [];

function buildMailer(): Mailer {
  const base = new NodemailerMailer();
  if (!CAPTURE) return base;
  return {
    sendVerification: async (email, token) => { captureLog.push({ email, token }); },
    sendReset: async (email, token) => { captureLog.push({ email, token }); },
    sendInvite: async (email, token) => { captureLog.push({ email, token }); },
  };
}

const userStore = new InMemoryUserStore();
const sessionStore = new InMemorySessionStore();
const coupleStore = new InMemoryCoupleStore();
const authDeps = { userStore, mailer: buildMailer() };
const sessionDeps = { userStore, sessionStore };

const signupHandler = createSignupHandler(authDeps);
const verifyHandler = createVerifyHandler(authDeps);
const resendHandler = createResendHandler(authDeps);
const loginHandler = createLoginHandler(sessionDeps, new LoginRateLimiter());
const meHandler = createMeHandler(sessionDeps);
const logoutHandler = createLogoutHandler({ sessionStore });
const resetRequestHandler = createResetRequestHandler({ userStore, mailer: authDeps.mailer });
const resetCompleteHandler = createResetCompleteHandler({ userStore, sessionStore });
const inviteHandler = createInviteHandler({ userStore, coupleStore, mailer: authDeps.mailer, sessionStore });
const acceptHandler = createAcceptHandler({ userStore, coupleStore, mailer: authDeps.mailer, sessionStore });

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
  if (req.method === 'POST' && path === '/api/auth/logout') {
    logoutHandler(req, res).catch(err => { console.error(err); res.writeHead(500); res.end(); });
    return;
  }
  if (req.method === 'POST' && path === '/api/auth/reset-request') {
    resetRequestHandler(req, res).catch(err => { console.error(err); res.writeHead(500); res.end(); });
    return;
  }
  if (req.method === 'POST' && path === '/api/auth/reset-complete') {
    resetCompleteHandler(req, res).catch(err => { console.error(err); res.writeHead(500); res.end(); });
    return;
  }
  if (req.method === 'POST' && path === '/api/couple/invite') {
    inviteHandler(req, res).catch(err => { console.error(err); res.writeHead(500); res.end(); });
    return;
  }
  if (req.method === 'POST' && path === '/api/couple/accept') {
    acceptHandler(req, res).catch(err => { console.error(err); res.writeHead(500); res.end(); });
    return;
  }
  if (CAPTURE && req.method === 'GET' && path === '/api/dev/user') {
    const email = url.searchParams.get('email') ?? '';
    userStore.findByEmail(email).then(user => {
      if (!user) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'not found' })); return; }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ userId: user.id, email: user.email, state: user.state, spouseId: user.spouseId, coupleId: user.coupleId }));
    }).catch(err => { console.error(err); res.writeHead(500); res.end(); });
    return;
  }
  if (CAPTURE && req.method === 'GET' && path === '/api/dev/last-token') {
    const email = url.searchParams.get('email') ?? '';
    const last = [...captureLog].reverse().find(e => e.email === email);
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
