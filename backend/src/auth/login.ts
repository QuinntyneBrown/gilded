import { compare } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { UserStore } from './user-store.ts';
import type { SessionStore } from './session-store.ts';
import { LoginRateLimiter, makeRateLimitKey } from './rate-limit.ts';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface LoginDeps {
  userStore: UserStore;
  sessionStore: SessionStore;
}

export type LoginResult =
  | { outcome: 'ok'; sessionId: string }
  | { outcome: 'invalid_credentials' }
  | { outcome: 'not_verified' };

export async function loginUser(
  email: string,
  password: string,
  { userStore, sessionStore }: LoginDeps,
): Promise<LoginResult> {
  const normalized = email.toLowerCase().trim();
  const user = await userStore.findByEmail(normalized);
  if (!user) return { outcome: 'invalid_credentials' };

  const match = await compare(password, user.passwordHash);
  if (!match) return { outcome: 'invalid_credentials' };

  if (user.state !== 'active') return { outcome: 'not_verified' };

  const now = new Date();
  const sessionId = randomUUID();
  await sessionStore.create({
    id: sessionId,
    userId: user.id,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    lastSeenAt: now,
  });

  return { outcome: 'ok', sessionId };
}

export async function getSessionUser(
  req: IncomingMessage,
  { sessionStore }: LoginDeps,
): Promise<{ userId: string } | null> {
  const cookie = req.headers.cookie ?? '';
  const sid = cookie.split(';').map(c => c.trim()).find(c => c.startsWith('sid='))?.slice(4);
  if (!sid) return null;

  const session = await sessionStore.findById(sid);
  if (!session || session.expiresAt < new Date()) return null;

  const now = new Date();
  await sessionStore.touch(sid, now, new Date(now.getTime() + SESSION_TTL_MS));

  return { userId: session.userId };
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error('bad json')); } });
    req.on('error', reject);
  });
}

export function createLoginHandler(deps: LoginDeps, rateLimiter: LoginRateLimiter) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    let body: unknown;
    try { body = await readJson(req); } catch { body = {}; }
    const { email, password } = (body ?? {}) as Record<string, unknown>;

    if (typeof email !== 'string' || !email || typeof password !== 'string' || !password) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'email and password required' }));
      return;
    }

    const rlKey = makeRateLimitKey(email, req);
    const { limited, retryAfterSecs } = rateLimiter.check(rlKey);
    if (limited) {
      res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': String(retryAfterSecs) });
      res.end(JSON.stringify({ error: 'Too many failed attempts. Try again later.' }));
      return;
    }

    const result = await loginUser(email, password, deps);

    if (result.outcome !== 'ok') {
      rateLimiter.record(rlKey);
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid credentials or unverified account' }));
      return;
    }

    const maxAge = SESSION_TTL_MS / 1000;
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': `sid=${result.sessionId}; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}; Path=/`,
    });
    res.end(JSON.stringify({ message: 'Logged in.' }));
  };
}

export function createMeHandler(deps: LoginDeps) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const session = await getSessionUser(req, deps);
    if (!session) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not authenticated' }));
      return;
    }
    const user = await deps.userStore.findById(session.userId);
    let spouseEmail: string | null = null;
    if (user?.spouseId) {
      const spouse = await deps.userStore.findById(user.spouseId);
      spouseEmail = spouse?.email ?? null;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      userId: session.userId,
      email: user?.email,
      coupleId: user?.coupleId ?? null,
      spouseId: user?.spouseId ?? null,
      spouseEmail,
    }));
  };
}
