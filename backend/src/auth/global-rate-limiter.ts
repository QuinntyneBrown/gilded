import type { IncomingMessage } from 'node:http';

export class SlidingWindowLimiter {
  private readonly buckets = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  checkAndRecord(bucketKey: string, now = Date.now()): { limited: boolean; retryAfterSecs: number } {
    const hits = (this.buckets.get(bucketKey) ?? []).filter(t => now - t < this.windowMs);
    if (hits.length >= this.limit) {
      this.buckets.set(bucketKey, hits);
      const expiresAt = Math.min(...hits) + this.windowMs;
      return { limited: true, retryAfterSecs: Math.ceil((expiresAt - now) / 1000) };
    }
    hits.push(now);
    this.buckets.set(bucketKey, hits);
    return { limited: false, retryAfterSecs: 0 };
  }
}

export function ipKey(req: IncomingMessage): string {
  const fwd = req.headers['x-forwarded-for'];
  return typeof fwd === 'string' ? fwd.split(',')[0].trim() : (req.socket.remoteAddress ?? 'unknown');
}
