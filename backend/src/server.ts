import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import { createSignupHandler } from './auth/signup.ts';
import { InMemoryUserStore } from './auth/user-store.ts';
import { NodemailerMailer } from './auth/mailer.ts';

const signupHandler = createSignupHandler({
  userStore: new InMemoryUserStore(),
  mailer: new NodemailerMailer(),
});

export function handler(req: IncomingMessage, res: ServerResponse): void {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }
  if (req.method === 'POST' && req.url === '/api/auth/signup') {
    signupHandler(req, res).catch((err) => {
      console.error(err);
      res.writeHead(500);
      res.end();
    });
    return;
  }
  res.writeHead(404);
  res.end();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createServer(handler).listen(3000);
}
