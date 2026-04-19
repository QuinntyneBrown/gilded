import { randomBytes, createHash, randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import bcrypt from 'bcryptjs';
import type { UserStore, User } from './user-store.ts';
import type { Mailer } from './mailer.ts';
import type { CaptchaVerifier } from './captcha.ts';

const PASSWORD_RE = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,}$/;

export function validatePassword(password: string): boolean {
  return PASSWORD_RE.test(password);
}

export interface SignupDeps {
  userStore: UserStore;
  mailer: Mailer;
  captchaVerifier?: CaptchaVerifier;
}

export async function signupUser(
  email: string,
  password: string,
  { userStore, mailer }: SignupDeps,
): Promise<void> {
  const normalized = email.toLowerCase().trim();
  const existing = await userStore.findByEmail(normalized);
  if (existing) return;

  const passwordHash = await bcrypt.hash(password, 12);
  const user: User = {
    id: randomUUID(),
    email: normalized,
    passwordHash,
    state: 'pending_verification',
    createdAt: new Date(),
  };
  await userStore.create(user);

  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  await userStore.saveToken({ userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 86_400_000) });

  mailer.sendVerification(normalized, rawToken).catch(console.error);
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => { try { resolve(JSON.parse(data)); } catch { reject(new Error('bad json')); } });
    req.on('error', reject);
  });
}

const GENERIC_BODY = JSON.stringify({ message: 'If this email is new, check your inbox to verify.' });

export function createSignupHandler(deps: SignupDeps) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    let body: unknown;
    try { body = await readJson(req); }
    catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid request body' }));
      return;
    }

    const { email, password, captchaToken } = (body ?? {}) as Record<string, unknown>;

    if (deps.captchaVerifier) {
      if (typeof captchaToken !== 'string' || !captchaToken) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'captchaToken required' }));
        return;
      }
      const { success } = await deps.captchaVerifier.verify(captchaToken);
      if (!success) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'CAPTCHA verification failed' }));
        return;
      }
    }

    if (typeof email !== 'string' || !email || typeof password !== 'string' || !password) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'email and password required' }));
      return;
    }

    if (!validatePassword(password)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'password does not meet policy requirements' }));
      return;
    }

    await signupUser(email, password, deps);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(GENERIC_BODY);
  };
}
