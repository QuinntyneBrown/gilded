import { createHash } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

const WINDOW_MS = 15 * 60 * 1000; // L2-002 AC3
const MAX_ATTEMPTS = 5;            // L2-002 AC3

export class LoginRateLimiter {
  private readonly failures = new Map<string, number[]>();

  check(key: string, now = Date.now()): { limited: boolean; retryAfterSecs: number } {
    const attempts = (this.failures.get(key) ?? []).filter(t => now - t < WINDOW_MS);
    this.failures.set(key, attempts);
    if (attempts.length >= MAX_ATTEMPTS) {
      const expiresAt = Math.min(...attempts) + WINDOW_MS;
      return { limited: true, retryAfterSecs: Math.ceil((expiresAt - now) / 1000) };
    }
    return { limited: false, retryAfterSecs: 0 };
  }

  record(key: string, now = Date.now()): void {
    const attempts = (this.failures.get(key) ?? []).filter(t => now - t < WINDOW_MS);
    attempts.push(now);
    this.failures.set(key, attempts);
  }
}

export function makeRateLimitKey(email: string, req: IncomingMessage): string {
  const fwd = req.headers['x-forwarded-for'];
  const ip = typeof fwd === 'string' ? fwd.split(',')[0].trim() : (req.socket.remoteAddress ?? 'unknown');
  const emailHash = createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
  return `${emailHash}:${ip}`;
}
