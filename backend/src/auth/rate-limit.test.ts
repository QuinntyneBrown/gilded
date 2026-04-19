// Acceptance Test
// Traces to: T-010
// Description: LoginRateLimiter blocks after 5 failures in 15 min; window rolls off correctly.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LoginRateLimiter } from './rate-limit.ts';

test('allows first 5 failures then blocks on 6th', () => {
  const limiter = new LoginRateLimiter();
  const t0 = Date.now();

  for (let i = 0; i < 5; i++) {
    assert.equal(limiter.check('key', t0 + i).limited, false);
    limiter.record('key', t0 + i);
  }

  const { limited, retryAfterSecs } = limiter.check('key', t0 + 5);
  assert.equal(limited, true);
  assert.ok(retryAfterSecs > 0);
});

test('window rolls off after 15 minutes', () => {
  const limiter = new LoginRateLimiter();
  const t0 = Date.now();

  for (let i = 0; i < 5; i++) limiter.record('key', t0 + i);
  assert.equal(limiter.check('key', t0 + 5).limited, true);

  const after15 = t0 + 15 * 60 * 1000 + 1;
  assert.equal(limiter.check('key', after15).limited, false);
});

test('different keys are independent', () => {
  const limiter = new LoginRateLimiter();
  const t0 = Date.now();

  for (let i = 0; i < 5; i++) limiter.record('key-a', t0 + i);
  assert.equal(limiter.check('key-a', t0 + 5).limited, true);
  assert.equal(limiter.check('key-b', t0 + 5).limited, false);
});
