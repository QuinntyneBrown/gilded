// Acceptance Test
// Traces to: T-020
// Description: GeocodingService caches results, validates formats, calls upstream only on cache miss.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GeocodingService, InvalidPostalCode } from './geocoding.ts';
import { InMemoryPostalCodeCache } from './postal-cache.ts';
import type { GeocoderProvider } from './geocoding.ts';

function fakeProvider(latLng: { lat: number; lng: number }, delayMs = 0): { provider: GeocoderProvider; calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    provider: {
      geocode: async (code: string) => {
        calls.push(code);
        if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
        return latLng;
      },
    },
  };
}

test('uncached postal → upstream called once and result persisted', async () => {
  const cache = new InMemoryPostalCodeCache();
  const { provider, calls } = fakeProvider({ lat: 45.4, lng: -75.7 });
  const svc = new GeocodingService(cache, provider);

  const result = await svc.geocode('K1A 0A1');
  assert.deepEqual(result, { lat: 45.4, lng: -75.7 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0], 'K1A0A1');
});

test('second call for same code hits cache, upstream not called again', async () => {
  const cache = new InMemoryPostalCodeCache();
  const { provider, calls } = fakeProvider({ lat: 45.4, lng: -75.7 });
  const svc = new GeocodingService(cache, provider);

  await svc.geocode('K1A0A1');
  await svc.geocode('K1A0A1');
  assert.equal(calls.length, 1);
});

test('pre-cached postal → upstream not called', async () => {
  const cache = new InMemoryPostalCodeCache();
  await cache.save('K1A0A1', 45.4, -75.7);
  const { provider, calls } = fakeProvider({ lat: 0, lng: 0 });
  const svc = new GeocodingService(cache, provider);

  const result = await svc.geocode('K1A0A1');
  assert.deepEqual(result, { lat: 45.4, lng: -75.7 });
  assert.equal(calls.length, 0);
});

test('US ZIP code is accepted and normalized to 5 digits', async () => {
  const cache = new InMemoryPostalCodeCache();
  const { provider, calls } = fakeProvider({ lat: 34.05, lng: -118.24 });
  const svc = new GeocodingService(cache, provider);

  const result = await svc.geocode('90210-1234');
  assert.deepEqual(result, { lat: 34.05, lng: -118.24 });
  assert.equal(calls[0], '90210');
});

test('invalid format throws InvalidPostalCode without calling upstream', async () => {
  const cache = new InMemoryPostalCodeCache();
  const { provider, calls } = fakeProvider({ lat: 0, lng: 0 });
  const svc = new GeocodingService(cache, provider);

  await assert.rejects(() => svc.geocode('INVALID'), InvalidPostalCode);
  assert.equal(calls.length, 0);
});

test('latency budget: uncached with 200 ms upstream completes in < 1000 ms', async () => {
  const cache = new InMemoryPostalCodeCache();
  const { provider } = fakeProvider({ lat: 45.0, lng: -75.0 }, 200);
  const svc = new GeocodingService(cache, provider);

  const start = Date.now();
  await svc.geocode('M5H2N2');
  assert.ok(Date.now() - start < 1000, 'must complete within 1000 ms');
});

test('cached lookup completes in < 100 ms', async () => {
  const cache = new InMemoryPostalCodeCache();
  await cache.save('V6B2L9', 49.28, -123.12);
  const { provider } = fakeProvider({ lat: 0, lng: 0 });
  const svc = new GeocodingService(cache, provider);

  const start = Date.now();
  await svc.geocode('V6B2L9');
  assert.ok(Date.now() - start < 100, 'cached lookup must complete within 100 ms');
});
