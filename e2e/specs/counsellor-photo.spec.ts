// Acceptance Test
// Traces to: T-024
// Description: Photo upload validates MIME/size/dimensions; stored file served via GET; no-photo profile renders avatar.

import { expect, test } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';
const SEED = `${BASE}/api/dev/seed/counsellor`;
const PHOTO_URL = (id: string) => `${BASE}/api/counsellors/${id}/photo`;
const PROFILE_URL = (id: string) => `${BASE}/api/counsellors/${id}`;

const BASE_COUNSELLOR = {
  name: 'Dr. Photo Test',
  denomination: 'Test',
  credentials: ['PhD'],
  specialties: ['anxiety'],
  address: '1 Test St, Ottawa',
  phone: '+1-613-555-0001',
  source: 'web_research',
  verified: true,
};

function makeJpeg(width: number, height: number): Buffer {
  return Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10,
    0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0xFF, 0xC0, 0x00, 0x11, 0x08,
    (height >> 8) & 0xFF, height & 0xFF,
    (width >> 8) & 0xFF, width & 0xFF,
    0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    0xFF, 0xD9,
  ]);
}

test.describe('POST /api/counsellors/:id/photo', () => {
  test('valid 200×200 JPEG → 200, photo accessible via GET', async ({ request }) => {
    const ts = Date.now();
    const { id } = await (await request.post(SEED, { data: { ...BASE_COUNSELLOR, email: `photo-ok-${ts}@example.com` } })).json() as { id: string };

    const uploadRes = await request.post(PHOTO_URL(id), {
      multipart: { photo: { name: 'photo.jpg', mimeType: 'image/jpeg', buffer: makeJpeg(200, 200) } },
    });
    expect(uploadRes.status()).toBe(200);

    const profile = await (await request.get(PROFILE_URL(id))).json() as { photoUrl: string };
    expect(profile.photoUrl).toBeTruthy();

    const photoRes = await request.get(PHOTO_URL(id));
    expect(photoRes.status()).toBe(200);
    expect(photoRes.headers()['content-type']).toMatch(/image\/jpeg/);
  });

  test('file > 5 MB → 413', async ({ request }) => {
    const ts = Date.now() + 1;
    const { id } = await (await request.post(SEED, { data: { ...BASE_COUNSELLOR, email: `photo-big-${ts}@example.com` } })).json() as { id: string };

    const bigFile = Buffer.alloc(6 * 1024 * 1024, 0xFF);
    bigFile[0] = 0xFF; bigFile[1] = 0xD8; bigFile[2] = 0xFF;

    const res = await request.post(PHOTO_URL(id), {
      multipart: { photo: { name: 'big.jpg', mimeType: 'image/jpeg', buffer: bigFile } },
    });
    expect(res.status()).toBe(413);
  });

  test('non-image MIME → 415', async ({ request }) => {
    const ts = Date.now() + 2;
    const { id } = await (await request.post(SEED, { data: { ...BASE_COUNSELLOR, email: `photo-mime-${ts}@example.com` } })).json() as { id: string };

    const res = await request.post(PHOTO_URL(id), {
      multipart: { photo: { name: 'file.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') } },
    });
    expect(res.status()).toBe(415);
  });

  test('100×100 JPEG (too small) → 400', async ({ request }) => {
    const ts = Date.now() + 3;
    const { id } = await (await request.post(SEED, { data: { ...BASE_COUNSELLOR, email: `photo-small-${ts}@example.com` } })).json() as { id: string };

    const res = await request.post(PHOTO_URL(id), {
      multipart: { photo: { name: 'small.jpg', mimeType: 'image/jpeg', buffer: makeJpeg(100, 100) } },
    });
    expect(res.status()).toBe(400);
  });
});

test('profile page without photo renders counsellor-avatar element', async ({ page, request }) => {
  const ts = Date.now() + 4;
  const { id } = await (await request.post(SEED, { data: { ...BASE_COUNSELLOR, email: `photo-noavatar-${ts}@example.com` } })).json() as { id: string };

  await page.goto(`/counsellors/${id}`);
  await page.locator('app-counsellor-avatar').waitFor({ timeout: 10_000 });
  await expect(page.locator('app-counsellor-avatar')).toBeVisible();
});
