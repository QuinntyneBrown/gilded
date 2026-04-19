export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  lastSeenAt: Date;
}

export interface SessionStore {
  create(session: Session): Promise<void>;
  findById(id: string): Promise<Session | null>;
  touch(id: string, lastSeenAt: Date, expiresAt: Date): Promise<void>;
  delete(id: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}

export class InMemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, Session>();

  async create(session: Session): Promise<void> {
    this.sessions.set(session.id, { ...session });
  }

  async findById(id: string): Promise<Session | null> {
    return this.sessions.get(id) ?? null;
  }

  async touch(id: string, lastSeenAt: Date, expiresAt: Date): Promise<void> {
    const s = this.sessions.get(id);
    if (s) { s.lastSeenAt = lastSeenAt; s.expiresAt = expiresAt; }
  }

  async delete(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  async deleteByUserId(userId: string): Promise<void> {
    for (const [id, s] of this.sessions) {
      if (s.userId === userId) this.sessions.delete(id);
    }
  }
}
