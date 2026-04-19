import { randomUUID } from 'node:crypto';

export interface Notification {
  id: string;
  userId: string;
  message: string;
  createdAt: Date;
  readAt?: Date;
}

export interface NotificationStore {
  push(userId: string, message: string): Promise<void>;
  findUnread(userId: string): Promise<Notification[]>;
  markAllRead(userId: string): Promise<void>;
}

export class InMemoryNotificationStore implements NotificationStore {
  private readonly items: Notification[] = [];

  async push(userId: string, message: string): Promise<void> {
    this.items.push({ id: randomUUID(), userId, message, createdAt: new Date() });
  }

  async findUnread(userId: string): Promise<Notification[]> {
    return this.items.filter(n => n.userId === userId && !n.readAt);
  }

  async markAllRead(userId: string): Promise<void> {
    const now = new Date();
    for (const n of this.items) {
      if (n.userId === userId && !n.readAt) n.readAt = now;
    }
  }
}
