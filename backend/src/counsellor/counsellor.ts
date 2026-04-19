import type { IncomingMessage, ServerResponse } from 'node:http';
import type { CounsellorStore } from './counsellor-store.ts';

export function createGetCounsellorHandler({ counsellorStore }: { counsellorStore: CounsellorStore }) {
  return async (req: IncomingMessage, res: ServerResponse, id: string): Promise<void> => {
    const counsellor = await counsellorStore.findById(id);
    if (!counsellor) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found.' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      id: counsellor.id,
      name: counsellor.name,
      denomination: counsellor.denomination,
      credentials: counsellor.credentials,
      specialties: counsellor.specialties,
      address: counsellor.address,
      phone: counsellor.phone,
      email: counsellor.email,
      website: counsellor.website ?? null,
      bookingLink: counsellor.bookingLink ?? null,
      source: counsellor.source,
      verified: counsellor.verified,
      submittedBy: counsellor.submittedBy ?? null,
      sourceUrl: counsellor.sourceUrl ?? null,
      photoUrl: counsellor.photoUrl ?? null,
      rating: counsellor.reviewCount > 0 ? (counsellor.rating ?? null) : null,
      reviewCount: counsellor.reviewCount,
    }));
  };
}
