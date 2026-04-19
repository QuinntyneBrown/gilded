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
  create(user: User): Promise<void>;
  saveToken(token: VerificationToken): Promise<void>;
}

export class InMemoryUserStore implements UserStore {
  private readonly users = new Map<string, User>();
  private readonly tokens: VerificationToken[] = [];

  async findByEmail(email: string): Promise<User | null> {
    return this.users.get(email) ?? null;
  }

  async create(user: User): Promise<void> {
    this.users.set(user.email, user);
  }

  async saveToken(token: VerificationToken): Promise<void> {
    this.tokens.push(token);
  }
}
