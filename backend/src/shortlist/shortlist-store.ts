export interface ShortlistItem {
  ownerKey: string;
  counsellorId: string;
  addedAt: Date;
  addedBy: string;
}

export interface ShortlistStore {
  add(ownerKey: string, counsellorId: string, addedBy: string): Promise<'created' | 'exists'>;
  remove(ownerKey: string, counsellorId: string): Promise<void>;
  findByOwner(ownerKey: string): Promise<ShortlistItem[]>;
  mergeOwner(fromKey: string, toKey: string): Promise<void>;
}

export class InMemoryShortlistStore implements ShortlistStore {
  private readonly items: ShortlistItem[] = [];

  async add(ownerKey: string, counsellorId: string, addedBy: string): Promise<'created' | 'exists'> {
    const exists = this.items.some(i => i.ownerKey === ownerKey && i.counsellorId === counsellorId);
    if (exists) return 'exists';
    this.items.push({ ownerKey, counsellorId, addedAt: new Date(), addedBy });
    return 'created';
  }

  async remove(ownerKey: string, counsellorId: string): Promise<void> {
    const idx = this.items.findIndex(i => i.ownerKey === ownerKey && i.counsellorId === counsellorId);
    if (idx !== -1) this.items.splice(idx, 1);
  }

  async findByOwner(ownerKey: string): Promise<ShortlistItem[]> {
    return this.items.filter(i => i.ownerKey === ownerKey);
  }

  async mergeOwner(fromKey: string, toKey: string): Promise<void> {
    const fromItems = this.items.filter(i => i.ownerKey === fromKey);
    for (const item of fromItems) {
      const hasDuplicate = this.items.some(i => i.ownerKey === toKey && i.counsellorId === item.counsellorId);
      if (hasDuplicate) {
        this.items.splice(this.items.indexOf(item), 1);
      } else {
        item.ownerKey = toKey;
      }
    }
  }
}
