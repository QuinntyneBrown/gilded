export interface CounsellorRating {
  userId: string;
  counsellorId: string;
  stars: number;
  updatedAt: Date;
}

export interface RatingStore {
  upsert(userId: string, counsellorId: string, stars: number): Promise<void>;
  findByCounsellor(counsellorId: string): Promise<CounsellorRating[]>;
}

export class InMemoryRatingStore implements RatingStore {
  private readonly ratings = new Map<string, CounsellorRating>();

  async upsert(userId: string, counsellorId: string, stars: number): Promise<void> {
    const key = `${userId}:${counsellorId}`;
    this.ratings.set(key, { userId, counsellorId, stars, updatedAt: new Date() });
  }

  async findByCounsellor(counsellorId: string): Promise<CounsellorRating[]> {
    return [...this.ratings.values()].filter(r => r.counsellorId === counsellorId);
  }
}
