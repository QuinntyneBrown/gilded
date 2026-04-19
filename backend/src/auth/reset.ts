import { createHash, randomBytes } from 'node:crypto';
import { hash as bcryptHash } from 'bcryptjs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { UserStore } from './user-store.ts';
import type { SessionStore } from './session-store.ts';
import type { Mailer } from './mailer.ts';
import { validatePassword } from './signup.ts';

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour


export async function requestPasswordReset(
  email: string,
  { userStore, mailer }: { userStore: UserStore; mailer: Mailer },
): Promise<void> {
  const normalized = email.toLowerCase().trim();
  const user = await userStore.findByEmail(normalized);
  if (!user || user.state !== 'active') return;

  await userStore.deleteResetTokensByUserId(user.id);

  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  await userStore.saveResetToken({ userId: user.id, tokenHash, expiresAt: new Date(Date.now() + RESET_TTL_MS) });

  mailer.sendReset(normalized, rawToken).catch(console.error);
}

export async function completePasswordReset(
  rawToken: string,
  newPassword: string,
  { userStore, sessionStore }: { userStore: UserStore; sessionStore: SessionStore },
): Promise<'ok' | 'invalid' | 'policy_violation'> {
  if (!validatePassword(newPassword)) return 'policy_violation';

  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const token = await userStore.findResetTokenByHash(tokenHash);
  if (!token || token.expiresAt < new Date()) return 'invalid';

  await userStore.deleteResetToken(tokenHash);
  const passwordHash = await bcryptHash(newPassword, 12);
  await userStore.updatePassword(token.userId, passwordHash);
  await sessionStore.deleteByUserId(token.userId);

  return 'ok';
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error('bad json')); } });
    req.on('error', reject);
  });
}

export function createResetRequestHandler({ userStore, mailer }: { userStore: UserStore; mailer: Mailer }) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    let body: unknown;
    try { body = await readJson(req); } catch { body = {}; }
    const { email } = (body ?? {}) as Record<string, unknown>;
    if (typeof email === 'string' && email) {
      await requestPasswordReset(email, { userStore, mailer });
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'If your account exists, a password reset email has been sent.' }));
  };
}

export function createResetCompleteHandler({ userStore, sessionStore }: { userStore: UserStore; sessionStore: SessionStore }) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    let body: unknown;
    try { body = await readJson(req); } catch { body = {}; }
    const { token, newPassword } = (body ?? {}) as Record<string, unknown>;

    if (typeof token !== 'string' || !token || typeof newPassword !== 'string' || !newPassword) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'token and newPassword required' }));
      return;
    }

    const result = await completePasswordReset(token, newPassword, { userStore, sessionStore });

    if (result === 'ok') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Password updated. You can now log in.' }));
      return;
    }

    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: result === 'policy_violation' ? 'Password does not meet policy.' : 'Invalid or expired token.' }));
  };
}
