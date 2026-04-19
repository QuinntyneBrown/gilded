import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export interface RequestLog {
  requestId: string;
  userId?: string;
  route: string;
  method: string;
  status: number;
  latencyMs: number;
}

export interface Logger {
  logRequest(entry: RequestLog): void;
}

export class ConsoleLogger implements Logger {
  logRequest(entry: RequestLog): void {
    process.stdout.write(JSON.stringify(entry) + '\n');
  }
}

function generateRequestId(): string {
  const ts = Date.now().toString(36).padStart(9, '0');
  const rand = randomUUID().replace(/-/g, '').slice(0, 16);
  return ts + rand;
}

export function createRequestMiddleware(deps: { logger: Logger }) {
  return async (
    req: IncomingMessage,
    res: ServerResponse,
    handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>
  ): Promise<void> => {
    const requestId = generateRequestId();
    const start = Date.now();
    let status = 200;

    const origWriteHead = res.writeHead.bind(res);
    (res as unknown as Record<string, unknown>)['writeHead'] = (
      code: number,
      headersOrMsg?: string | Record<string, unknown>,
      maybeHeaders?: Record<string, unknown>
    ) => {
      status = code;
      if (typeof headersOrMsg === 'object' && headersOrMsg !== null) {
        headersOrMsg['X-Request-Id'] = requestId;
        return origWriteHead(code, headersOrMsg as never);
      }
      if (typeof headersOrMsg === 'string' && maybeHeaders) {
        maybeHeaders['X-Request-Id'] = requestId;
        return origWriteHead(code, headersOrMsg, maybeHeaders as never);
      }
      return origWriteHead(code, { 'X-Request-Id': requestId } as never);
    };

    try {
      await handler(req, res);
    } finally {
      const latencyMs = Date.now() - start;
      const userId = (req as unknown as { userId?: string }).userId;
      deps.logger.logRequest({
        requestId,
        ...(userId ? { userId } : {}),
        route: req.url?.split('?')[0] ?? '/',
        method: req.method ?? 'GET',
        status,
        latencyMs,
      });
    }
  };
}
