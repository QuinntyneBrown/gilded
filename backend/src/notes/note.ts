export type NoteVisibility = 'private' | 'spouse' | 'public';

export interface Note {
  id: string;
  authorId: string;
  coupleId?: string;
  visibility: NoteVisibility;
  ciphertext?: string;
  iv?: string;
  keyId?: string;
  body?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface NoteStore {
  create(note: Note): Promise<void>;
  findById(id: string): Promise<Note | null>;
  findByAuthor(authorId: string): Promise<Note[]>;
  findByCouple(coupleId: string): Promise<Note[]>;
  findPublic(offset: number, limit: number): Promise<Note[]>;
  update(id: string, patch: Partial<Pick<Note, 'ciphertext' | 'iv' | 'body' | 'updatedAt'>>): Promise<void>;
  softDelete(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
  anonymize(id: string): Promise<void>;
}

export class InMemoryNoteStore implements NoteStore {
  private readonly byId = new Map<string, Note>();

  async create(note: Note): Promise<void> {
    this.byId.set(note.id, note);
  }

  async findById(id: string): Promise<Note | null> {
    return this.byId.get(id) ?? null;
  }

  async findByAuthor(authorId: string): Promise<Note[]> {
    return [...this.byId.values()]
      .filter(n => n.authorId === authorId && !n.deletedAt)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findByCouple(coupleId: string): Promise<Note[]> {
    return [...this.byId.values()]
      .filter(n => n.coupleId === coupleId && !n.deletedAt)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findPublic(offset: number, limit: number): Promise<Note[]> {
    return [...this.byId.values()]
      .filter(n => n.visibility === 'public' && !n.deletedAt)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);
  }

  async update(id: string, patch: Partial<Pick<Note, 'ciphertext' | 'iv' | 'body' | 'updatedAt'>>): Promise<void> {
    const note = this.byId.get(id);
    if (note) Object.assign(note, patch);
  }

  async softDelete(id: string): Promise<void> {
    const note = this.byId.get(id);
    if (note) note.deletedAt = new Date();
  }

  async hardDelete(id: string): Promise<void> {
    this.byId.delete(id);
  }

  async anonymize(id: string): Promise<void> {
    const note = this.byId.get(id);
    if (note) { note.authorId = ''; note.ciphertext = undefined; note.iv = undefined; note.keyId = undefined; }
  }
}
