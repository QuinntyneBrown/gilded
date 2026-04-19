import { createHash, randomBytes } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { UserStore } from './user-store.ts';
import type { Mailer } from './mailer.ts';

export interface VerifyDeps {
  userStore: UserStore;
  mailer: Mailer;
}

export async function verifyEmail(
  rawToken: string,
  { userStore }: VerifyDeps,
): Promise<'ok' | 'invalid'> {
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const token = await userStore.findTokenByHash(tokenHash);
  if (!token || token.expiresAt < new Date()) return 'invalid';

  await userStore.deleteToken(tokenHash);
  await userStore.activateUser(token.userId);
  return 'ok';
}

export async function resendVerification(
  email: string,
  { userStore, mailer }: VerifyDeps,
): Promise<void> {
  const normalized = email.toLowerCase().trim();
  const user = await userStore.findByEmail(normalized);
  if (!user || user.state !== 'pending_verification') return;

  await userStore.deleteTokensByUserId(user.id);

  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  await userStore.saveToken({ userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 86_400_000) });

  mailer.sendVerification(normalized, rawToken).catch(console.error);
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error('bad json')); } });
    req.on('error', reject);
  });
}

export function createVerifyHandler(deps: VerifyDeps) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const token = new URL(req.url ?? '', 'http://x').searchParams.get('token') ?? '';
    if (!token) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'token required', resend: '/api/auth/resend-verification' }));
      return;
    }
    const result = await verifyEmail(token, deps);
    if (result === 'invalid') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid or expired token', resend: '/api/auth/resend-verification' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Email verified. You can now log in.' }));
  };
}

export function createResendHandler(deps: VerifyDeps) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    let body: unknown;
    try { body = await readJson(req); } catch { body = {}; }
    const { email } = (body ?? {}) as Record<string, unknown>;
    if (typeof email === 'string' && email) {
      await resendVerification(email, deps);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'If you have a pending account, a new verification email has been sent.' }));
  };
}
