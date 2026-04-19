import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { CounsellorStore } from './counsellor-store.ts';

const MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_DIR = process.env['PHOTO_DIR'] ?? join(tmpdir(), 'gilded-photos');

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function bufIndexOf(haystack: Buffer, needle: Buffer, from = 0): number {
  const limit = haystack.length - needle.length;
  outer: for (let i = from; i <= limit; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function detectMime(buf: Buffer): string | null {
  if (buf.length < 4) return null;
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'image/png';
  if (buf.length >= 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'image/webp';
  return null;
}

function getJpegDimensions(buf: Buffer): { width: number; height: number } | null {
  let pos = 2;
  while (pos + 4 <= buf.length) {
    if (buf[pos] !== 0xFF) return null;
    const marker = buf[pos + 1];
    if (marker === 0xD9) return null;
    if ((marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC5 && marker <= 0xC7)) {
      if (pos + 9 > buf.length) return null;
      return { height: buf.readUInt16BE(pos + 5), width: buf.readUInt16BE(pos + 7) };
    }
    if (pos + 4 > buf.length) return null;
    const segLen = buf.readUInt16BE(pos + 2);
    pos += 2 + segLen;
  }
  return null;
}

function getPngDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 24) return null;
  const sig = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  for (let i = 0; i < 8; i++) if (buf[i] !== sig[i]) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function getDimensions(mime: string, buf: Buffer): { width: number; height: number } | null {
  if (mime === 'image/jpeg') return getJpegDimensions(buf);
  if (mime === 'image/png') return getPngDimensions(buf);
  return { width: 400, height: 400 }; // webp: skip dimension check
}

async function readBodyLimited(req: IncomingMessage, limit: number): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) { req.destroy(); resolve(null); }
      else chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function extractFilePart(body: Buffer, boundary: string): Buffer | null {
  const bBuf = Buffer.from('--' + boundary);
  const headerEndBuf = Buffer.from('\r\n\r\n');
  const nextBndBuf = Buffer.concat([Buffer.from('\r\n'), bBuf]);

  let pos = bufIndexOf(body, bBuf, 0);
  while (pos !== -1) {
    const after = pos + bBuf.length;
    if (after + 2 <= body.length && body[after] === 0x2D && body[after + 1] === 0x2D) break;
    const headerStart = after + 2;
    const headerEnd = bufIndexOf(body, headerEndBuf, headerStart);
    if (headerEnd === -1) break;
    const header = body.slice(headerStart, headerEnd).toString();
    if (header.toLowerCase().includes('filename=')) {
      const dataStart = headerEnd + 4;
      const dataEnd = bufIndexOf(body, nextBndBuf, dataStart);
      return body.slice(dataStart, dataEnd === -1 ? body.length : dataEnd);
    }
    pos = bufIndexOf(body, bBuf, after);
  }
  return null;
}

export function createUploadPhotoHandler({ counsellorStore }: { counsellorStore: CounsellorStore }) {
  return async (req: IncomingMessage, res: ServerResponse, id: string): Promise<void> => {
    const counsellor = await counsellorStore.findById(id);
    if (!counsellor) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found.' }));
      return;
    }

    const contentLength = Number(req.headers['content-length'] ?? 0);
    if (contentLength > MAX_BYTES) {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'File too large. Maximum 5 MB.' }));
      return;
    }

    const ct = req.headers['content-type'] ?? '';
    const boundaryMatch = ct.match(/boundary=([^\s;]+)/);
    if (!boundaryMatch) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Multipart boundary missing.' }));
      return;
    }
    const boundary = boundaryMatch[1];

    const body = await readBodyLimited(req, MAX_BYTES + 4096);
    if (!body) {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'File too large. Maximum 5 MB.' }));
      return;
    }

    const fileData = extractFilePart(body, boundary);
    if (!fileData) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No file part found.' }));
      return;
    }

    if (fileData.length > MAX_BYTES) {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'File too large. Maximum 5 MB.' }));
      return;
    }

    const mime = detectMime(fileData);
    if (!mime) {
      res.writeHead(415, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unsupported image type. Use JPEG, PNG, or WebP.' }));
      return;
    }

    const dims = getDimensions(mime, fileData);
    if (dims && (dims.width < 200 || dims.height < 200 || dims.width > 4000 || dims.height > 4000)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Image dimensions must be between 200 and 4000 px.' }));
      return;
    }

    if (!existsSync(PHOTO_DIR)) await mkdir(PHOTO_DIR, { recursive: true });

    const hash = createHash('sha256').update(fileData).digest('hex').slice(0, 32);
    const filename = hash + MIME_EXT[mime];
    await writeFile(join(PHOTO_DIR, filename), fileData);
    await counsellorStore.updatePhoto(id, filename);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ photoUrl: `/api/counsellors/${id}/photo` }));
  };
}

export function createServePhotoHandler({ counsellorStore }: { counsellorStore: CounsellorStore }) {
  return async (_req: IncomingMessage, res: ServerResponse, id: string): Promise<void> => {
    const counsellor = await counsellorStore.findById(id);
    if (!counsellor?.photoFilename) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No photo.' }));
      return;
    }

    const filePath = join(PHOTO_DIR, counsellor.photoFilename);
    let data: Buffer;
    try {
      data = await readFile(filePath);
    } catch {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Photo not found on disk.' }));
      return;
    }

    const mime = detectMime(data) ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  };
}

export function makeTestJpeg(width: number, height: number): Buffer {
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

export { randomUUID };
