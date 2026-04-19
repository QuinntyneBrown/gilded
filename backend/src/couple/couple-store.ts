import { timingSafeEqual } from 'node:crypto';

export interface Couple {
  id: string;
  createdAt: Date;
  chosenCounsellorId?: string;
}

export interface CoupleInvite {
  id: string;
  inviterId: string;
  inviteeEmail: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface CoupleStore {
  createCouple(couple: Couple): Promise<void>;
  findById(coupleId: string): Promise<Couple | null>;
  setChosenCounsellor(coupleId: string, counsellorId: string): Promise<void>;
  saveInvite(invite: CoupleInvite): Promise<void>;
  findInviteByHash(tokenHash: string): Promise<CoupleInvite | null>;
  deleteInvite(tokenHash: string): Promise<void>;
  deleteInvitesByInviter(inviterId: string): Promise<void>;
  deleteCouple(coupleId: string): Promise<void>;
}

export class InMemoryCoupleStore implements CoupleStore {
  private readonly couples = new Map<string, Couple>();
  private invites: CoupleInvite[] = [];

  async createCouple(couple: Couple): Promise<void> {
    this.couples.set(couple.id, couple);
  }

  async findById(coupleId: string): Promise<Couple | null> {
    return this.couples.get(coupleId) ?? null;
  }

  async setChosenCounsellor(coupleId: string, counsellorId: string): Promise<void> {
    const couple = this.couples.get(coupleId);
    if (couple) couple.chosenCounsellorId = counsellorId;
  }

  async saveInvite(invite: CoupleInvite): Promise<void> {
    this.invites.push(invite);
  }

  async findInviteByHash(tokenHash: string): Promise<CoupleInvite | null> {
    const needle = Buffer.from(tokenHash);
    return this.invites.find(i => {
      const stored = Buffer.from(i.tokenHash);
      return stored.length === needle.length && timingSafeEqual(stored, needle);
    }) ?? null;
  }

  async deleteInvite(tokenHash: string): Promise<void> {
    this.invites = this.invites.filter(i => i.tokenHash !== tokenHash);
  }

  async deleteInvitesByInviter(inviterId: string): Promise<void> {
    this.invites = this.invites.filter(i => i.inviterId !== inviterId);
  }

  async deleteCouple(coupleId: string): Promise<void> {
    this.couples.delete(coupleId);
  }
}
