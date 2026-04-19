import { timingSafeEqual } from 'node:crypto';

export type UserState = 'pending_verification' | 'active' | 'disabled';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  state: UserState;
  createdAt: Date;
}

export interface VerificationToken {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface UserStore {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(user: User): Promise<void>;
  activateUser(userId: string): Promise<void>;
  saveToken(token: VerificationToken): Promise<void>;
  findTokenByHash(tokenHash: string): Promise<VerificationToken | null>;
  deleteToken(tokenHash: string): Promise<void>;
  deleteTokensByUserId(userId: string): Promise<void>;
}

export class InMemoryUserStore implements UserStore {
  private readonly users = new Map<string, User>();
  private readonly byId = new Map<string, User>();
  private tokens: VerificationToken[] = [];

  async findByEmail(email: string): Promise<User | null> {
    return this.users.get(email) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    return this.byId.get(id) ?? null;
  }

  async create(user: User): Promise<void> {
    this.users.set(user.email, user);
    this.byId.set(user.id, user);
  }

  async activateUser(userId: string): Promise<void> {
    const user = this.byId.get(userId);
    if (user) user.state = 'active';
  }

  async saveToken(token: VerificationToken): Promise<void> {
    this.tokens.push(token);
  }

  async findTokenByHash(tokenHash: string): Promise<VerificationToken | null> {
    const needle = Buffer.from(tokenHash);
    return this.tokens.find((t) => {
      const stored = Buffer.from(t.tokenHash);
      return stored.length === needle.length && timingSafeEqual(stored, needle);
    }) ?? null;
  }

  async deleteToken(tokenHash: string): Promise<void> {
    this.tokens = this.tokens.filter((t) => t.tokenHash !== tokenHash);
  }

  async deleteTokensByUserId(userId: string): Promise<void> {
    this.tokens = this.tokens.filter((t) => t.userId !== userId);
  }
}
