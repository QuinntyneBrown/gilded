export interface Comment {
  id: string;
  reviewId: string;
  authorId: string;
  body: string;
  createdAt: Date;
  deletedAt?: Date;
  deletedBy?: 'author' | 'moderator';
}

export interface CommentStore {
  create(comment: Comment): Promise<void>;
  findById(id: string): Promise<Comment | null>;
  findByReview(reviewId: string): Promise<Comment[]>;
  findByAuthor(authorId: string): Promise<Comment[]>;
  softDelete(id: string, deletedBy: 'author' | 'moderator'): Promise<void>;
  anonymize(id: string): Promise<void>;
}

export class InMemoryCommentStore implements CommentStore {
  private readonly byId = new Map<string, Comment>();

  async create(comment: Comment): Promise<void> {
    this.byId.set(comment.id, comment);
  }

  async findById(id: string): Promise<Comment | null> {
    return this.byId.get(id) ?? null;
  }

  async findByReview(reviewId: string): Promise<Comment[]> {
    return [...this.byId.values()]
      .filter(c => c.reviewId === reviewId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findByAuthor(authorId: string): Promise<Comment[]> {
    return [...this.byId.values()].filter(c => c.authorId === authorId);
  }

  async softDelete(id: string, deletedBy: 'author' | 'moderator'): Promise<void> {
    const c = this.byId.get(id);
    if (c) { c.deletedAt = new Date(); c.deletedBy = deletedBy; }
  }

  async anonymize(id: string): Promise<void> {
    const c = this.byId.get(id);
    if (c) c.authorId = '';
  }
}
