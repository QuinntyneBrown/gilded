// Acceptance Test
// Traces to: L1-011, L1-012
// Description: Backend health endpoint returns 200 with { status: 'ok' }.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { handler } from './server.ts';

test('GET /health returns 200 with { status: "ok" }', async () => {
  const srv = createServer(handler);
  await new Promise<void>(resolve => srv.listen(0, resolve));
  const { port } = srv.address() as { port: number };

  const res = await fetch(`http://localhost:${port}/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });

  await new Promise<void>((resolve, reject) => srv.close(e => (e ? reject(e) : resolve())));
});
