import type { IncomingMessage, ServerResponse } from 'node:http';
import { Registry, Histogram, Counter } from 'prom-client';

export const registry = new Registry();

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

export const authFailuresTotal = new Counter({
  name: 'auth_failures_total',
  help: 'Total number of authentication failures',
  labelNames: ['route'] as const,
  registers: [registry],
});

export function recordRequest(method: string, route: string, status: number, durationSec: number): void {
  httpRequestDuration.observe({ method, route, status: String(status) }, durationSec);
  if (status === 401) {
    authFailuresTotal.inc({ route });
  }
}

export function recordAuthFailure(reason: string): void {
  authFailuresTotal.inc({ route: reason });
}

export function createMetricsHandler(token?: string) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    if (token) {
      const auth = (req.headers as Record<string, string>)['authorization'] ?? '';
      if (auth !== `Bearer ${token}`) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized.' }));
        return;
      }
    }
    const output = await registry.metrics();
    res.writeHead(200, { 'Content-Type': registry.contentType });
    res.end(output);
  };
}
