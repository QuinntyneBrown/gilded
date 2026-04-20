// Acceptance Test
// Traces to: L1-011, L1-012
// Description: Backend health endpoint returns 200 with { status: 'ok' }.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
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

test('serves the built frontend and SPA fallback when CLIENT_DIST_DIR is configured', async () => {
  const clientDir = await mkdtemp(join(tmpdir(), 'gilded-frontend-'));
  const previousClientDir = process.env['CLIENT_DIST_DIR'];
  process.env['CLIENT_DIST_DIR'] = clientDir;

  await mkdir(join(clientDir, 'assets'), { recursive: true });
  await writeFile(join(clientDir, 'index.html'), '<!doctype html><title>Gilded</title>');
  await writeFile(join(clientDir, 'assets', 'main.js'), 'console.log("gilded");');

  const srv = createServer(handler);
  await new Promise<void>(resolve => srv.listen(0, resolve));
  const { port } = srv.address() as { port: number };

  try {
    const home = await fetch(`http://localhost:${port}/`);
    assert.equal(home.status, 200);
    assert.equal(await home.text(), '<!doctype html><title>Gilded</title>');

    const clientRoute = await fetch(`http://localhost:${port}/notes/public`);
    assert.equal(clientRoute.status, 200);
    assert.equal(await clientRoute.text(), '<!doctype html><title>Gilded</title>');

    const asset = await fetch(`http://localhost:${port}/assets/main.js`);
    assert.equal(asset.status, 200);
    assert.equal(await asset.text(), 'console.log("gilded");');

    const missingAsset = await fetch(`http://localhost:${port}/assets/missing.js`);
    assert.equal(missingAsset.status, 404);
  } finally {
    if (previousClientDir) {
      process.env['CLIENT_DIST_DIR'] = previousClientDir;
    } else {
      delete process.env['CLIENT_DIST_DIR'];
    }

    await new Promise<void>((resolve, reject) => srv.close(e => (e ? reject(e) : resolve())));
    await rm(clientDir, { force: true, recursive: true });
  }
});
