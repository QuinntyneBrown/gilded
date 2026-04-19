import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import { createSignupHandler } from './auth/signup.ts';
import { createVerifyHandler, createResendHandler } from './auth/verify.ts';
import { createLoginHandler, createMeHandler } from './auth/login.ts';
import { createLogoutHandler } from './auth/logout.ts';
import { createResetRequestHandler, createResetCompleteHandler } from './auth/reset.ts';
import { createInviteHandler, createAcceptHandler } from './couple/invite.ts';
import { createUnlinkHandler } from './couple/unlink.ts';
import { createGetCounsellorHandler } from './counsellor/counsellor.ts';
import { createUploadPhotoHandler, createServePhotoHandler } from './counsellor/photo.ts';
import { createSearchCounsellorsHandler } from './counsellor/search.ts';
import { GeocodingService } from './geo/geocoding.ts';
import { InMemoryPostalCodeCache } from './geo/postal-cache.ts';
import { InMemoryUserStore } from './auth/user-store.ts';
import { InMemorySessionStore } from './auth/session-store.ts';
import { InMemoryCoupleStore } from './couple/couple-store.ts';
import { InMemoryCounsellorStore } from './counsellor/counsellor-store.ts';
import { EventBus } from './events.ts';
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
const counsellorStore = new InMemoryCounsellorStore();
const postalCache = new InMemoryPostalCodeCache();
const geocodingService = new GeocodingService(postalCache, {
  geocode: async () => { throw new Error('GEOCODING_API_KEY not configured'); },
});
const eventBus = new EventBus();
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
const unlinkHandler = createUnlinkHandler({ userStore, coupleStore, sessionStore, eventBus });
const getCounsellorHandler = createGetCounsellorHandler({ counsellorStore });
const uploadPhotoHandler = createUploadPhotoHandler({ counsellorStore });
const servePhotoHandler = createServePhotoHandler({ counsellorStore });
const searchCounsellorsHandler = createSearchCounsellorsHandler({ counsellorStore, geocodingService });

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
  if (req.method === 'POST' && path === '/api/couple/unlink') {
    unlinkHandler(req, res).catch(err => { console.error(err); res.writeHead(500); res.end(); });
    return;
  }
  if (req.method === 'POST' && path.startsWith('/api/counsellors/') && path.endsWith('/photo')) {
    const id = path.slice('/api/counsellors/'.length, -'/photo'.length);
    uploadPhotoHandler(req, res, id).catch(err => { console.error(err); res.writeHead(500); res.end(); });
    return;
  }
  if (req.method === 'GET' && path.startsWith('/api/counsellors/') && path.endsWith('/photo')) {
    const id = path.slice('/api/counsellors/'.length, -'/photo'.length);
    servePhotoHandler(req, res, id).catch(err => { console.error(err); res.writeHead(500); res.end(); });
    return;
  }
  if (req.method === 'GET' && path === '/api/counsellors') {
    searchCounsellorsHandler(req, res).catch(err => { console.error(err); res.writeHead(500); res.end(); });
    return;
  }
  if (req.method === 'GET' && path.startsWith('/api/counsellors/')) {
    const id = path.slice('/api/counsellors/'.length);
    getCounsellorHandler(req, res, id).catch(err => { console.error(err); res.writeHead(500); res.end(); });
    return;
  }
  if (CAPTURE && req.method === 'POST' && path === '/api/dev/seed/postal') {
    (async () => {
      let data = '';
      await new Promise<void>((resolve, reject) => {
        req.on('data', (c) => (data += c));
        req.on('end', () => resolve());
        req.on('error', reject);
      });
      const body = JSON.parse(data) as { code: string; lat: number; lng: number };
      await postalCache.save(body.code.toUpperCase().replace(/\s/g, ''), body.lat, body.lng);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    })().catch(err => { console.error(err); res.writeHead(500); res.end(); });
    return;
  }
  if (CAPTURE && req.method === 'POST' && path === '/api/dev/seed/counsellor') {
    (async () => {
      let data = '';
      await new Promise<void>((resolve, reject) => {
        req.on('data', (c) => (data += c));
        req.on('end', () => resolve());
        req.on('error', reject);
      });
      const body = JSON.parse(data) as Record<string, unknown>;
      const incomingSourceUrl = body['sourceUrl'] as string | undefined;
      if (incomingSourceUrl) {
        const existing = await counsellorStore.findBySourceUrl(incomingSourceUrl);
        if (existing) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ id: existing.id }));
          return;
        }
      }
      const { randomUUID } = await import('node:crypto');
      const counsellor = {
        id: randomUUID(),
        name: String(body['name'] ?? ''),
        normalizedName: String(body['name'] ?? '').toLowerCase().trim(),
        denomination: String(body['denomination'] ?? ''),
        credentials: (body['credentials'] as string[]) ?? [],
        specialties: (body['specialties'] as string[]) ?? [],
        address: String(body['address'] ?? ''),
        normalizedAddress: String(body['address'] ?? '').toLowerCase().trim(),
        phone: String(body['phone'] ?? ''),
        email: String(body['email'] ?? ''),
        website: body['website'] as string | undefined,
        bookingLink: body['bookingLink'] as string | undefined,
        source: (body['source'] as 'web_research' | 'user_submitted') ?? 'web_research',
        verified: Boolean(body['verified'] ?? false),
        submittedBy: body['submittedBy'] as string | undefined,
        sourceUrl: incomingSourceUrl,
        photoUrl: body['photoUrl'] as string | undefined,
        rating: body['rating'] as number | undefined,
        reviewCount: Number(body['reviewCount'] ?? 0),
      };
      await counsellorStore.create(counsellor);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id: counsellor.id }));
    })().catch(err => { console.error(err); res.writeHead(500); res.end(); });
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
  if (CAPTURE && req.method === 'GET' && path === '/api/dev/events') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ events: eventBus.all() }));
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
