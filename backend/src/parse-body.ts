import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ZodSchema } from 'zod';

export async function parseBody<T>(
  req: IncomingMessage,
  res: ServerResponse,
  schema: ZodSchema<T>,
): Promise<T | null> {
  let data = '';
  try {
    await new Promise<void>((resolve, reject) => {
      req.on('data', (c) => (data += c));
      req.on('end', () => resolve());
      req.on('error', reject);
    });
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to read request body.' }));
    return null;
  }

  let raw: unknown;
  try { raw = JSON.parse(data); }
  catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid JSON in request body.' }));
    return null;
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Validation failed.', issues: result.error.issues }));
    return null;
  }

  return result.data;
}
