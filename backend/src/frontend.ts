import type { ServerResponse } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function frontendCandidates(): string[] {
  const configured = process.env['CLIENT_DIST_DIR'];

  return [
    configured,
    fileURLToPath(new URL('../public/', import.meta.url)),
    fileURLToPath(new URL('../../frontend/dist/gilded/browser/', import.meta.url)),
  ].filter((value): value is string => Boolean(value));
}

function resolveFrontendRoot(): string | null {
  for (const candidate of frontendCandidates()) {
    try {
      if (existsSync(candidate) && statSync(candidate).isDirectory()) {
        return candidate;
      }
    } catch {
      // Ignore invalid or transient filesystem entries and continue.
    }
  }

  return null;
}

function safeDecodePath(pathname: string): string {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

function resolveRequestedFile(frontendRoot: string, pathname: string): string | null {
  const decodedPath = safeDecodePath(pathname);
  const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '');
  const resolvedPath = resolve(frontendRoot, normalize(relativePath));
  const allowedPrefix = frontendRoot.endsWith(sep) ? frontendRoot : `${frontendRoot}${sep}`;

  if (resolvedPath !== frontendRoot && !resolvedPath.startsWith(allowedPrefix)) {
    return null;
  }

  return resolvedPath;
}

function contentTypeFor(filePath: string): string {
  return MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

function sendFile(res: ServerResponse, filePath: string, headOnly: boolean): void {
  const fileStat = statSync(filePath);
  res.writeHead(200, {
    'Content-Length': String(fileStat.size),
    'Content-Type': contentTypeFor(filePath),
  });

  if (headOnly) {
    res.end();
    return;
  }

  const stream = createReadStream(filePath);
  stream.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(500);
    }
    res.end();
  });
  stream.pipe(res);
}

function isExistingFile(filePath: string | null): filePath is string {
  if (!filePath) {
    return false;
  }

  try {
    return existsSync(filePath) && statSync(filePath).isFile();
  } catch {
    return false;
  }
}

export function maybeServeFrontend(method: string | undefined, res: ServerResponse, pathname: string): boolean {
  if (method !== 'GET' && method !== 'HEAD') {
    return false;
  }

  const frontendRoot = resolveFrontendRoot();
  if (!frontendRoot) {
    return false;
  }

  const requestedFile = resolveRequestedFile(frontendRoot, pathname);
  if (isExistingFile(requestedFile)) {
    sendFile(res, requestedFile, method === 'HEAD');
    return true;
  }

  if (extname(pathname)) {
    return false;
  }

  const indexFile = join(frontendRoot, 'index.html');
  if (!isExistingFile(indexFile)) {
    return false;
  }

  sendFile(res, indexFile, method === 'HEAD');
  return true;
}
