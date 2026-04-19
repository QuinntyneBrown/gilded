export interface PostalCodeEntry {
  lat: number;
  lng: number;
  fetchedAt: Date;
}

export interface PostalCodeCache {
  find(code: string): Promise<{ lat: number; lng: number } | null>;
  save(code: string, lat: number, lng: number): Promise<void>;
}

export class InMemoryPostalCodeCache implements PostalCodeCache {
  private readonly store = new Map<string, PostalCodeEntry>();

  async find(code: string): Promise<{ lat: number; lng: number } | null> {
    const entry = this.store.get(code);
    return entry ? { lat: entry.lat, lng: entry.lng } : null;
  }

  async save(code: string, lat: number, lng: number): Promise<void> {
    this.store.set(code, { lat, lng, fetchedAt: new Date() });
  }
}
