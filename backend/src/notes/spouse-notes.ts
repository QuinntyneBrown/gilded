import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import type { NoteStore, Note } from './note.ts';
import type { SessionStore } from '../auth/session-store.ts';
import type { UserStore } from '../auth/user-store.ts';
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
  if (note.ciphertext && note.iv && note.keyId) {
    body = crypto.decrypt({ ciphertext: note.ciphertext, iv: note.iv, keyId: note.keyId });
  }
  return { id: note.id, body, visibility: note.visibility, createdAt: note.createdAt.toISOString(), updatedAt: note.updatedAt.toISOString() };
}

interface SpouseNoteDeps {
  noteStore: NoteStore;
  sessionStore: SessionStore;
  userStore: UserStore;
}

export function createCreateSpouseNoteHandler({ noteStore, sessionStore, userStore }: SpouseNoteDeps) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const session = await requireSession(req, sessionStore);
    if (!session) { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Authentication required.' })); return; }
    const user = await userStore.findById(session.userId);
    if (!user?.coupleId) { res.writeHead(409, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Must be in a couple to create a spouse note.' })); return; }

    const parsed = await parseBody(req, res, NoteBodySchema);
    if (!parsed) return;
    if (!parsed.body.trim()) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'body required.' })); return; }

    const keyId = `couple-${user.coupleId}`;
    const { ciphertext, iv } = crypto.encrypt(parsed.body.trim(), keyId);
    const now = new Date();
    const note: Note = { id: randomUUID(), authorId: session.userId, coupleId: user.coupleId, visibility: 'spouse', ciphertext, iv, keyId, createdAt: now, updatedAt: now };
    await noteStore.create(note);

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(renderNote(note)));
  };
}

export function createListSpouseNotesHandler({ noteStore, sessionStore, userStore }: SpouseNoteDeps) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const session = await requireSession(req, sessionStore);
    if (!session) { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Authentication required.' })); return; }
    const user = await userStore.findById(session.userId);
    if (!user?.coupleId) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify([])); return; }
    const notes = await noteStore.findByCouple(user.coupleId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(notes.map(renderNote)));
  };
}

export function createUpdateSpouseNoteHandler({ noteStore, sessionStore }: { noteStore: NoteStore; sessionStore: SessionStore }) {
  return async (req: IncomingMessage, res: ServerResponse, noteId: string): Promise<void> => {
    const session = await requireSession(req, sessionStore);
    if (!session) { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Authentication required.' })); return; }
    const note = await noteStore.findById(noteId);
    if (!note || note.visibility !== 'spouse' || note.deletedAt) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Not found.' })); return; }
    if (note.authorId !== session.userId) { res.writeHead(403, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Forbidden.' })); return; }

    const parsed = await parseBody(req, res, NoteBodySchema);
    if (!parsed) return;
    if (!parsed.body.trim()) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'body required.' })); return; }

    const keyId = note.keyId!;
    const { ciphertext, iv } = crypto.encrypt(parsed.body.trim(), keyId);
    await noteStore.update(noteId, { ciphertext, iv, updatedAt: new Date() });
    const updated = await noteStore.findById(noteId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(renderNote(updated!)));
  };
}

export function createDeleteSpouseNoteHandler({ noteStore, sessionStore }: { noteStore: NoteStore; sessionStore: SessionStore }) {
  return async (req: IncomingMessage, res: ServerResponse, noteId: string): Promise<void> => {
    const session = await requireSession(req, sessionStore);
    if (!session) { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Authentication required.' })); return; }
    const note = await noteStore.findById(noteId);
    if (!note || note.visibility !== 'spouse' || note.deletedAt) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Not found.' })); return; }
    if (note.authorId !== session.userId) { res.writeHead(403, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Forbidden.' })); return; }
    await noteStore.softDelete(noteId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  };
}
