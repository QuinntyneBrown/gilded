import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';

export function handler(req: IncomingMessage, res: ServerResponse): void {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }
  res.writeHead(404);
  res.end();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createServer(handler).listen(3000);
}
