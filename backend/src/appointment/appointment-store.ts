import { randomUUID } from 'node:crypto';

export type AppointmentStatus = 'pending' | 'booked' | 'cancelled';

export interface AppointmentIntent {
  id: string;
  ownerKey: string;
  counsellorId: string;
  createdAt: Date;
  status: AppointmentStatus;
}

export interface AppointmentStore {
  create(ownerKey: string, counsellorId: string): Promise<AppointmentIntent>;
  findById(id: string): Promise<AppointmentIntent | null>;
  findCurrentByOwner(ownerKey: string): Promise<AppointmentIntent | null>;
  updateStatus(id: string, status: AppointmentStatus): Promise<void>;
}

export class InMemoryAppointmentStore implements AppointmentStore {
  private readonly items = new Map<string, AppointmentIntent>();

  async create(ownerKey: string, counsellorId: string): Promise<AppointmentIntent> {
    const intent: AppointmentIntent = { id: randomUUID(), ownerKey, counsellorId, createdAt: new Date(), status: 'pending' };
    this.items.set(intent.id, intent);
    return intent;
  }

  async findById(id: string): Promise<AppointmentIntent | null> {
    return this.items.get(id) ?? null;
  }

  async findCurrentByOwner(ownerKey: string): Promise<AppointmentIntent | null> {
    return [...this.items.values()].find(i => i.ownerKey === ownerKey && i.status === 'pending') ?? null;
  }

  async updateStatus(id: string, status: AppointmentStatus): Promise<void> {
    const item = this.items.get(id);
    if (item) item.status = status;
  }
}
