import type { IncomingMessage, ServerResponse } from 'node:http';
import type { CounsellorStore } from './counsellor-store.ts';
import type { GeocodingService } from '../geo/geocoding.ts';
import { InvalidPostalCode } from '../geo/geocoding.ts';
import { haversineKm } from '../geo/haversine.ts';

const PAGE_SIZE = 20;
const DEFAULT_RADIUS_KM = 25;

export function createSearchCounsellorsHandler({ counsellorStore, geocodingService }: {
  counsellorStore: CounsellorStore;
  geocodingService: GeocodingService;
}) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const url = new URL(req.url ?? '', 'http://x');
    const postal = url.searchParams.get('postal') ?? '';
    const radiusKm = Number(url.searchParams.get('radiusKm') ?? DEFAULT_RADIUS_KM);
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));

    if (!postal) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'postal parameter is required' }));
      return;
    }

    let center: { lat: number; lng: number };
    try {
      center = await geocodingService.geocode(postal);
    } catch (e) {
      if (e instanceof InvalidPostalCode) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid postal code.' }));
        return;
      }
      throw e;
    }

    const latDelta = radiusKm / 111.0;
    const lngDelta = radiusKm / (111.0 * Math.cos(center.lat * Math.PI / 180));
    const minLat = center.lat - latDelta;
    const maxLat = center.lat + latDelta;
    const minLng = center.lng - lngDelta;
    const maxLng = center.lng + lngDelta;

    const all = await counsellorStore.findAll();
    const withDistance = all
      .filter(c => c.lat !== undefined && c.lng !== undefined
        && c.lat >= minLat && c.lat <= maxLat && c.lng >= minLng && c.lng <= maxLng)
      .map(c => ({ ...c, distanceKm: haversineKm(center.lat, center.lng, c.lat!, c.lng!) }))
      .filter(c => c.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const total = withDistance.length;
    const offset = (page - 1) * PAGE_SIZE;
    const items = withDistance.slice(offset, offset + PAGE_SIZE);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ items, total, page, pageSize: PAGE_SIZE }));
  };
}
