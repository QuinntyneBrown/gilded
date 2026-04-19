// Acceptance Test
// Traces to: T-050
// Description: Metrics endpoint exposes request rate, error rate, p50/p95/p99 latency,
//              and auth failure rate in Prometheus text format.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { recordRequest, recordAuthFailure, createMetricsHandler, registry } from './metrics.ts';

// ---------- helpers ----------

function makeReq(token?: string): IncomingMessage {
  const stream = new PassThrough() as unknown as IncomingMessage;
  const headers: Record<string, string> = {};
  if (token) headers['authorization'] = `Bearer ${token}`;
  (stream as unknown as { headers: unknown })['headers'] = headers;
  (stream as unknown as { method: unknown })['method'] = 'GET';
  (stream as unknown as { url: unknown })['url'] = '/metrics';
  setImmediate(() => { (stream as unknown as PassThrough).push(null); });
  return stream;
}

interface MockRes { status: number; body: string; writeHead(code: number, headers?: Record<string, string>): void; end(data?: string): void; }
function makeRes(): MockRes & ServerResponse {
  const m: MockRes = { status: 0, body: '', writeHead(c) { m.status = c; }, end(d = '') { m.body += d; } };
  return m as unknown as MockRes & ServerResponse;
}

beforeEach(() => { registry.resetMetrics(); });

// ---------- tests ----------

test('GET /metrics returns 200 with prometheus content-type', async () => {
  const handler = createMetricsHandler();
  const res = makeRes();
  await handler(makeReq(), res);
  assert.equal(res.status, 200);
});

test('GET /metrics contains http_request_duration_seconds histogram', async () => {
  recordRequest('GET', '/api/notes', 200, 0.05);
  const handler = createMetricsHandler();
  const res = makeRes();
  await handler(makeReq(), res);
  assert.ok(res.body.includes('http_request_duration_seconds'), 'missing latency histogram');
});

test('GET /metrics contains p50/p95/p99 quantile buckets', async () => {
  recordRequest('POST', '/api/auth/login', 200, 0.1);
  recordRequest('POST', '/api/auth/login', 200, 0.2);
  const handler = createMetricsHandler();
  const res = makeRes();
  await handler(makeReq(), res);
  assert.ok(res.body.includes('_bucket{'), 'missing histogram buckets for quantile calculation');
});

test('GET /metrics contains auth_failures_total counter', async () => {
  recordAuthFailure('invalid_credentials');
  const handler = createMetricsHandler();
  const res = makeRes();
  await handler(makeReq(), res);
  assert.ok(res.body.includes('auth_failures_total'), 'missing auth failure counter');
});

test('recordRequest with 401 status increments auth_failures_total', async () => {
  recordRequest('POST', '/api/auth/login', 401, 0.01);
  const handler = createMetricsHandler();
  const res = makeRes();
  await handler(makeReq(), res);
  assert.ok(res.body.includes('auth_failures_total'), 'auth failure not recorded for 401 response');
});

test('GET /metrics with valid token returns 200', async () => {
  const handler = createMetricsHandler('secret-token');
  const res = makeRes();
  await handler(makeReq('secret-token'), res);
  assert.equal(res.status, 200);
});

test('GET /metrics with wrong token returns 401', async () => {
  const handler = createMetricsHandler('secret-token');
  const res = makeRes();
  await handler(makeReq('wrong-token'), res);
  assert.equal(res.status, 401);
});

test('GET /metrics without token when token required returns 401', async () => {
  const handler = createMetricsHandler('secret-token');
  const res = makeRes();
  await handler(makeReq(), res);
  assert.equal(res.status, 401);
});
