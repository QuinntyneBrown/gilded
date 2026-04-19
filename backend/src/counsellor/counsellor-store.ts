export type CounsellorSource = 'web_research' | 'user_submitted';

export interface Counsellor {
  id: string;
  name: string;
  normalizedName: string;
  denomination: string;
  credentials: string[];
  specialties: string[];
  address: string;
  normalizedAddress: string;
  phone: string;
  email: string;
  website?: string;
  bookingLink?: string;
  source: CounsellorSource;
  verified: boolean;
  submittedBy?: string;
  sourceUrl?: string;
  photoUrl?: string;
  rating?: number;
  reviewCount: number;
  lat?: number;
  lng?: number;
  photoFilename?: string;
}

export interface CounsellorStore {
  create(counsellor: Counsellor): Promise<void>;
  findById(id: string): Promise<Counsellor | null>;
  findAll(): Promise<Counsellor[]>;
  updatePhoto(id: string, filename: string): Promise<void>;
}

export class InMemoryCounsellorStore implements CounsellorStore {
  private readonly byId = new Map<string, Counsellor>();

  async create(counsellor: Counsellor): Promise<void> {
    this.byId.set(counsellor.id, counsellor);
  }

  async findById(id: string): Promise<Counsellor | null> {
    return this.byId.get(id) ?? null;
  }

  async findAll(): Promise<Counsellor[]> {
    return [...this.byId.values()];
  }

  async updatePhoto(id: string, filename: string): Promise<void> {
    const c = this.byId.get(id);
    if (c) c.photoFilename = filename;
  }
}
