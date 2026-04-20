import { timingSafeEqual } from 'node:crypto';

export type UserState = 'pending_verification' | 'active' | 'disabled' | 'pending_deletion';

export type UserRole = 'user' | 'moderator' | 'admin';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  state: UserState;
  createdAt: Date;
  spouseId?: string;
  coupleId?: string;
  role?: UserRole;
  deletionRequestedAt?: Date;
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
  updatePassword(userId: string, passwordHash: string): Promise<void>;
  saveToken(token: VerificationToken): Promise<void>;
  findTokenByHash(tokenHash: string): Promise<VerificationToken | null>;
  deleteToken(tokenHash: string): Promise<void>;
  deleteTokensByUserId(userId: string): Promise<void>;
  saveResetToken(token: VerificationToken): Promise<void>;
  findResetTokenByHash(tokenHash: string): Promise<VerificationToken | null>;
  deleteResetToken(tokenHash: string): Promise<void>;
  deleteResetTokensByUserId(userId: string): Promise<void>;
  updateCouple(userId: string, coupleId: string, spouseId: string): Promise<void>;
  clearCouple(userId: string): Promise<void>;
  setRole(userId: string, role: UserRole): Promise<void>;
  requestDeletion(userId: string, at: Date): Promise<void>;
  findPendingDeletion(olderThan: Date): Promise<User[]>;
  delete(userId: string): Promise<void>;
}

export class InMemoryUserStore implements UserStore {
  private readonly users = new Map<string, User>();
  private readonly byId = new Map<string, User>();
  private tokens: VerificationToken[] = [];
  private resetTokens: VerificationToken[] = [];

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

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    const user = this.byId.get(userId);
    if (user) user.passwordHash = passwordHash;
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

  async saveResetToken(token: VerificationToken): Promise<void> {
    this.resetTokens.push(token);
  }

  async findResetTokenByHash(tokenHash: string): Promise<VerificationToken | null> {
    const needle = Buffer.from(tokenHash);
    return this.resetTokens.find((t) => {
      const stored = Buffer.from(t.tokenHash);
      return stored.length === needle.length && timingSafeEqual(stored, needle);
    }) ?? null;
  }

  async deleteResetToken(tokenHash: string): Promise<void> {
    this.resetTokens = this.resetTokens.filter((t) => t.tokenHash !== tokenHash);
  }

  async deleteResetTokensByUserId(userId: string): Promise<void> {
    this.resetTokens = this.resetTokens.filter((t) => t.userId !== userId);
  }

  async updateCouple(userId: string, coupleId: string, spouseId: string): Promise<void> {
    const user = this.byId.get(userId);
    if (user) { user.coupleId = coupleId; user.spouseId = spouseId; }
  }

  async clearCouple(userId: string): Promise<void> {
    const user = this.byId.get(userId);
    if (user) { delete user.coupleId; delete user.spouseId; }
  }

  async setRole(userId: string, role: UserRole): Promise<void> {
    const user = this.byId.get(userId);
    if (user) user.role = role;
  }

  async requestDeletion(userId: string, at: Date): Promise<void> {
    const user = this.byId.get(userId);
    if (user) { user.state = 'pending_deletion'; user.deletionRequestedAt = at; }
  }

  async findPendingDeletion(olderThan: Date): Promise<User[]> {
    return [...this.byId.values()].filter(
      u => u.state === 'pending_deletion' && u.deletionRequestedAt && u.deletionRequestedAt <= olderThan,
    );
  }

  async delete(userId: string): Promise<void> {
    const user = this.byId.get(userId);
    if (user) { this.users.delete(user.email); this.byId.delete(userId); }
  }
}
