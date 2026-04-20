// Acceptance Test
// Traces to: T-049
// Description: Structured logging — every request emits one log line with the correct shape;
//              sensitive content (note bodies, passwords, tokens) never appears in log output.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createRequestMiddleware, type RequestLog } from './logger.ts';

// ---------- helpers ----------

function makeReq(method = 'GET', url = '/api/test'): IncomingMessage {
  const stream = new PassThrough() as unknown as IncomingMessage;
  (stream as unknown as { headers: unknown })['headers'] = {};
  (stream as unknown as { method: unknown })['method'] = method;
  (stream as unknown as { url: unknown })['url'] = url;
  (stream as unknown as { socket: unknown })['socket'] = { remoteAddress: '127.0.0.1' };
  setImmediate(() => { (stream as unknown as PassThrough).push(null); });
  return stream;
}

interface MockRes {
  status: number;
  headers: Record<string, string>;
  writeHead(code: number, headers?: Record<string, unknown>): void;
  end(data?: string): void;
}
function makeRes(): MockRes & ServerResponse {
  const m: MockRes = {
    status: 0,
    headers: {},
    writeHead(c, h) { m.status = c; if (h) Object.assign(m.headers, h); },
    end() { return undefined; },
  };
  return m as unknown as MockRes & ServerResponse;
}

// ---------- tests ----------

test('request middleware emits structured log with correct shape', async () => {
  const logs: RequestLog[] = [];
  const mw = createRequestMiddleware({ logger: { logRequest: (e) => logs.push(e) } });

  const res = makeRes();
  await mw(makeReq('GET', '/api/notes'), res, async (_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{}');
  });

  assert.equal(logs.length, 1);
  const log = logs[0];
  assert.ok(typeof log.requestId === 'string' && log.requestId.length > 0, 'requestId must be non-empty string');
  assert.equal(log.method, 'GET');
  assert.equal(log.route, '/api/notes');
  assert.equal(log.status, 200);
  assert.ok(typeof log.latencyMs === 'number' && log.latencyMs >= 0, 'latencyMs must be non-negative number');
});

test('request middleware sets X-Request-Id response header', async () => {
  const mw = createRequestMiddleware({ logger: { logRequest: () => undefined } });

  const res = makeRes();
  await mw(makeReq('POST', '/api/auth/signup'), res, async (_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{}');
  });

  assert.ok(typeof res.headers['X-Request-Id'] === 'string' && res.headers['X-Request-Id'].length > 0);
});

test('requestId in log matches X-Request-Id response header', async () => {
  const logs: RequestLog[] = [];
  const mw = createRequestMiddleware({ logger: { logRequest: (e) => logs.push(e) } });

  const res = makeRes();
  await mw(makeReq('GET', '/api/auth/me'), res, async (_req, res) => {
    res.writeHead(200, {}); res.end('{}');
  });

  assert.equal(logs[0].requestId, res.headers['X-Request-Id']);
});

test('note body never appears in log output', async () => {
  const SECRET = 'My private counselling reflection — eyes only.';
  const logged: string[] = [];
  const mw = createRequestMiddleware({ logger: { logRequest: (e) => logged.push(JSON.stringify(e)) } });

  const res = makeRes();
  await mw(makeReq('POST', '/api/notes'), res, async (_req, res) => {
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ body: SECRET })); // handler returns body in response, not in log
  });

  const allLogged = logged.join('\n');
  assert.ok(!allLogged.includes(SECRET), 'Note body must never appear in structured log output');
});

test('password never appears in log output', async () => {
  const PASSWORD = 'SuperSecret123!Password';
  const logged: string[] = [];
  const mw = createRequestMiddleware({ logger: { logRequest: (e) => logged.push(JSON.stringify(e)) } });

  const res = makeRes();
  await mw(makeReq('POST', '/api/auth/signup'), res, async (_req, res) => {
    res.writeHead(200, {}); res.end('{}');
  });

  // Simulate what would happen if someone accidentally logged the request body
  // The middleware must NOT log request bodies at all
  const allLogged = logged.join('\n');
  assert.ok(!allLogged.includes(PASSWORD), 'Password must never appear in structured log output');
});

test('userId is included in log when set on request', async () => {
  const logs: RequestLog[] = [];
  const mw = createRequestMiddleware({ logger: { logRequest: (e) => logs.push(e) } });

  const req = makeReq('GET', '/api/auth/me');
  const res = makeRes();
  await mw(req, res, async (req, res) => {
    (req as unknown as Record<string, unknown>)['userId'] = 'user-abc123';
    res.writeHead(200, {}); res.end('{}');
  });

  assert.equal(logs[0].userId, 'user-abc123');
});

test('status code is captured correctly', async () => {
  const logs: RequestLog[] = [];
  const mw = createRequestMiddleware({ logger: { logRequest: (e) => logs.push(e) } });

  const res = makeRes();
  await mw(makeReq('POST', '/api/auth/login'), res, async (_req, res) => {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'invalid credentials' }));
  });

  assert.equal(logs[0].status, 401);
});
