export interface Review {
  id: string;
  counsellorId: string;
  authorId: string;
  body: string;
  createdAt: Date;
  deletedAt?: Date;
  deletedBy?: 'author' | 'moderator';
}

export interface ReviewStore {
  create(review: Review): Promise<void>;
  findById(id: string): Promise<Review | null>;
  findByCounsellor(counsellorId: string): Promise<Review[]>;
  softDelete(id: string, deletedBy: 'author' | 'moderator'): Promise<void>;
}

export class InMemoryReviewStore implements ReviewStore {
  private readonly byId = new Map<string, Review>();

  async create(review: Review): Promise<void> {
    this.byId.set(review.id, review);
  }

  async findById(id: string): Promise<Review | null> {
    return this.byId.get(id) ?? null;
  }

  async findByCounsellor(counsellorId: string): Promise<Review[]> {
    return [...this.byId.values()]
      .filter(r => r.counsellorId === counsellorId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async softDelete(id: string, deletedBy: 'author' | 'moderator'): Promise<void> {
    const r = this.byId.get(id);
    if (r) { r.deletedAt = new Date(); r.deletedBy = deletedBy; }
  }
}
