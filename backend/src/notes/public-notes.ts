import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { NoteStore, Note } from './note.ts';
import type { SessionStore } from '../auth/session-store.ts';
import type { UserStore } from '../auth/user-store.ts';
import { evaluate } from '../moderation/ruleset.ts';

function parseCookies(header: string): Record<string, string> {
  return Object.fromEntries(
    header.split(';').map(p => p.trim().split('=').map(s => decodeURIComponent(s.trim())) as [string, string])
  );
}

async function requireSession(req: IncomingMessage, sessionStore: SessionStore) {
  const sid = parseCookies(req.headers['cookie'] ?? '')['sid'] ?? '';
  return sid ? sessionStore.findById(sid) : null;
}

function displayName(email: string): string {
  return email.split('@')[0];
}

function renderNote(note: Note, authorEmail: string) {
  return { id: note.id, body: note.body ?? '', visibility: note.visibility, authorDisplay: displayName(authorEmail), createdAt: note.createdAt.toISOString(), updatedAt: note.updatedAt.toISOString() };
}

interface PublicNoteDeps {
  noteStore: NoteStore;
  sessionStore: SessionStore;
  userStore: UserStore;
}

export function createCreatePublicNoteHandler({ noteStore, sessionStore, userStore }: PublicNoteDeps) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const session = await requireSession(req, sessionStore);
    if (!session) { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Authentication required.' })); return; }

    let data = '';
    await new Promise<void>((resolve, reject) => { req.on('data', c => (data += c)); req.on('end', () => resolve()); req.on('error', reject); });
    const { body } = JSON.parse(data) as { body?: string };
    const text = String(body ?? '').trim();
    if (!text) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'body required.' })); return; }

    const modResult = evaluate(text);
    if (modResult.verdict === 'reject') { res.writeHead(422, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Content rejected by moderation.', reason: modResult.reason })); return; }

    const user = await userStore.findById(session.userId);
    const now = new Date();
    const note: Note = { id: randomUUID(), authorId: session.userId, visibility: 'public', body: text, createdAt: now, updatedAt: now };
    await noteStore.create(note);

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(renderNote(note, user?.email ?? '')));
  };
}

export function createGetPublicFeedHandler({ noteStore, sessionStore }: { noteStore: NoteStore; sessionStore: SessionStore }) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const session = await requireSession(req, sessionStore);
    if (!session) { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Authentication required.' })); return; }
    const urlParsed = new URL(req.url ?? '', 'http://x');
    const offset = Number(urlParsed.searchParams.get('offset') ?? '0');
    const limit = 20;
    const notes = await noteStore.findPublic(offset, limit);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(notes.map(n => ({ id: n.id, body: n.body ?? '', visibility: n.visibility, authorId: n.authorId, createdAt: n.createdAt.toISOString(), updatedAt: n.updatedAt.toISOString() }))));
  };
}

export function createUpdatePublicNoteHandler({ noteStore, sessionStore, userStore }: PublicNoteDeps) {
  return async (req: IncomingMessage, res: ServerResponse, noteId: string): Promise<void> => {
    const session = await requireSession(req, sessionStore);
    if (!session) { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Authentication required.' })); return; }
    const note = await noteStore.findById(noteId);
    if (!note || note.visibility !== 'public' || note.deletedAt) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Not found.' })); return; }
    if (note.authorId !== session.userId) { res.writeHead(403, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Forbidden.' })); return; }

    let data = '';
    await new Promise<void>((resolve, reject) => { req.on('data', c => (data += c)); req.on('end', () => resolve()); req.on('error', reject); });
    const { body } = JSON.parse(data) as { body?: string };
    const text = String(body ?? '').trim();
    if (!text) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'body required.' })); return; }

    const modResult = evaluate(text);
    if (modResult.verdict === 'reject') { res.writeHead(422, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Content rejected by moderation.', reason: modResult.reason })); return; }

    await noteStore.update(noteId, { body: text, updatedAt: new Date() });
    const updated = await noteStore.findById(noteId);
    const user = await userStore.findById(session.userId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(renderNote(updated!, user?.email ?? '')));
  };
}

export function createDeletePublicNoteHandler({ noteStore, sessionStore }: { noteStore: NoteStore; sessionStore: SessionStore }) {
  return async (req: IncomingMessage, res: ServerResponse, noteId: string): Promise<void> => {
    const session = await requireSession(req, sessionStore);
    if (!session) { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Authentication required.' })); return; }
    const note = await noteStore.findById(noteId);
    if (!note || note.visibility !== 'public' || note.deletedAt) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Not found.' })); return; }
    if (note.authorId !== session.userId) { res.writeHead(403, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Forbidden.' })); return; }
    await noteStore.softDelete(noteId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  };
}
