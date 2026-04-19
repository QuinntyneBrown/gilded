import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import type { NoteStore, Note } from './note.ts';
import type { SessionStore } from '../auth/session-store.ts';
import { NoteCrypto } from './note-crypto.ts';
import { parseBody } from '../parse-body.ts';

const NoteBodySchema = z.object({ body: z.string() });

const NOTE_MASTER_KEY = process.env['NOTE_MASTER_KEY'] ?? 'a'.repeat(64);
const crypto = new NoteCrypto(NOTE_MASTER_KEY);

function parseCookies(header: string): Record<string, string> {
  return Object.fromEntries(
    header.split(';').map(p => p.trim().split('=').map(s => decodeURIComponent(s.trim())) as [string, string])
  );
}

async function requireSession(req: IncomingMessage, sessionStore: SessionStore) {
  const sid = parseCookies(req.headers['cookie'] ?? '')['sid'] ?? '';
  return sid ? sessionStore.findById(sid) : null;
}

function renderNote(note: Note): { id: string; body: string; visibility: string; createdAt: string; updatedAt: string } {
  let body = '';
  if (note.visibility === 'private' && note.ciphertext && note.iv && note.keyId) {
    body = crypto.decrypt({ ciphertext: note.ciphertext, iv: note.iv, keyId: note.keyId });
  }
  return { id: note.id, body, visibility: note.visibility, createdAt: note.createdAt.toISOString(), updatedAt: note.updatedAt.toISOString() };
}

export function createCreatePrivateNoteHandler({ noteStore, sessionStore }: { noteStore: NoteStore; sessionStore: SessionStore }) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const session = await requireSession(req, sessionStore);
    if (!session) { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Authentication required.' })); return; }

    const parsed = await parseBody(req, res, NoteBodySchema);
    if (!parsed) return;
    if (!parsed.body.trim()) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'body required.' })); return; }

    const keyId = `user-${session.userId}`;
    const { ciphertext, iv } = crypto.encrypt(parsed.body.trim(), keyId);
    const now = new Date();
    const note: Note = { id: randomUUID(), authorId: session.userId, visibility: 'private', ciphertext, iv, keyId, createdAt: now, updatedAt: now };
    await noteStore.create(note);

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(renderNote(note)));
  };
}

export function createListPrivateNotesHandler({ noteStore, sessionStore }: { noteStore: NoteStore; sessionStore: SessionStore }) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const session = await requireSession(req, sessionStore);
    if (!session) { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Authentication required.' })); return; }
    const notes = await noteStore.findByAuthor(session.userId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(notes.map(renderNote)));
  };
}

export function createUpdatePrivateNoteHandler({ noteStore, sessionStore }: { noteStore: NoteStore; sessionStore: SessionStore }) {
  return async (req: IncomingMessage, res: ServerResponse, noteId: string): Promise<void> => {
    const session = await requireSession(req, sessionStore);
    if (!session) { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Authentication required.' })); return; }
    const note = await noteStore.findById(noteId);
    if (!note || note.visibility !== 'private') { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Not found.' })); return; }
    if (note.authorId !== session.userId) { res.writeHead(403, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Forbidden.' })); return; }

    const parsed = await parseBody(req, res, NoteBodySchema);
    if (!parsed) return;
    if (!parsed.body.trim()) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'body required.' })); return; }

    const keyId = `user-${session.userId}`;
    const { ciphertext, iv } = crypto.encrypt(parsed.body.trim(), keyId);
    const updatedAt = new Date();
    await noteStore.update(noteId, { ciphertext, iv, updatedAt });

    const updated = await noteStore.findById(noteId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(renderNote(updated!)));
  };
}

export function createDeletePrivateNoteHandler({ noteStore, sessionStore }: { noteStore: NoteStore; sessionStore: SessionStore }) {
  return async (req: IncomingMessage, res: ServerResponse, noteId: string): Promise<void> => {
    const session = await requireSession(req, sessionStore);
    if (!session) { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Authentication required.' })); return; }
    const note = await noteStore.findById(noteId);
    if (!note || note.visibility !== 'private') { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Not found.' })); return; }
    if (note.authorId !== session.userId) { res.writeHead(403, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Forbidden.' })); return; }
    await noteStore.hardDelete(noteId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  };
}
