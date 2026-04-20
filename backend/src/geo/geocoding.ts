import type { PostalCodeCache } from './postal-cache.ts';

export class InvalidPostalCode extends Error {
  constructor(code: string) {
    super(`Invalid postal code: ${code}`);
    this.name = 'InvalidPostalCode';
  }
}

export interface GeocoderProvider {
  geocode(normalizedCode: string): Promise<{ lat: number; lng: number }>;
}

const CANADA_RE = /^[A-CEGHJ-NPRSTVXY]\d[A-CEGHJ-NPRSTV-Z] ?\d[A-CEGHJ-NPRSTV-Z]\d$/i;
const US_RE = /^\d{5}(-\d{4})?$/;

function normalize(code: string): string {
  const trimmed = code.trim();
  if (CANADA_RE.test(trimmed)) return trimmed.toUpperCase().replace(/\s/g, '');
  if (US_RE.test(trimmed)) return trimmed.slice(0, 5);
  return '';
}

export class GeocodingService {
  constructor(
    private readonly cache: PostalCodeCache,
    private readonly provider: GeocoderProvider,
  ) {}

  async geocode(code: string): Promise<{ lat: number; lng: number }> {
    const normalized = normalize(code);
    if (!normalized) throw new InvalidPostalCode(code);

    const cached = await this.cache.find(normalized);
    if (cached) return cached;

    const result = await this.provider.geocode(normalized);
    await this.cache.save(normalized, result.lat, result.lng);
    return result;
  }
}

export class HttpGeocoderProvider implements GeocoderProvider {
  private readonly apiKey: string;

  constructor() {
    const key = process.env['GEOCODING_API_KEY'];
    if (!key) throw new Error('GEOCODING_API_KEY env var is required');
    this.apiKey = key;
  }

  async geocode(normalizedCode: string): Promise<{ lat: number; lng: number }> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(normalizedCode)}&key=${this.apiKey}`;
    const res = await fetch(url);
    const data = await res.json() as { status: string; results: { geometry: { location: { lat: number; lng: number } } }[] };
    if (data.status !== 'OK' || !data.results[0]) throw new Error(`Geocoding failed for ${normalizedCode}: ${data.status}`);
    return data.results[0].geometry.location;
  }
}

const STATIC_LOOKUPS: Record<string, { lat: number; lng: number }> = {
  L5A4E6: { lat: 43.589, lng: -79.6441 },
  K1A0A1: { lat: 45.4215, lng: -75.6972 },
  M5H1J8: { lat: 43.6505, lng: -79.3841 },
  '90210': { lat: 34.0901, lng: -118.4065 },
};

export class StaticGeocoderProvider implements GeocoderProvider {
  async geocode(normalizedCode: string): Promise<{ lat: number; lng: number }> {
    const match = STATIC_LOOKUPS[normalizedCode];
    if (!match) {
      throw new Error(`No static geocode available for ${normalizedCode}`);
    }
    return match;
  }
}
