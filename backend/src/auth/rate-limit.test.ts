// Acceptance Test
// Traces to: T-045
// Description: SlidingWindowLimiter blocks after limit hits; window rolls off; keys are independent.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SlidingWindowLimiter } from './global-rate-limiter.ts';

test('allows first N requests then blocks', () => {
  const limiter = new SlidingWindowLimiter(3, 60_000);
  const t0 = Date.now();

  assert.equal(limiter.checkAndRecord('key', t0).limited, false);
  assert.equal(limiter.checkAndRecord('key', t0 + 1).limited, false);
  assert.equal(limiter.checkAndRecord('key', t0 + 2).limited, false);
  const { limited, retryAfterSecs } = limiter.checkAndRecord('key', t0 + 3);
  assert.equal(limited, true);
  assert.ok(retryAfterSecs > 0);
});

test('window rolls off after windowMs', () => {
  const limiter = new SlidingWindowLimiter(3, 60_000);
  const t0 = Date.now();

  for (let i = 0; i < 3; i++) limiter.checkAndRecord('key', t0 + i);
  assert.equal(limiter.checkAndRecord('key', t0 + 3).limited, true);

  const afterWindow = t0 + 60_001;
  assert.equal(limiter.checkAndRecord('key', afterWindow).limited, false);
});

test('different keys are independent', () => {
  const limiter = new SlidingWindowLimiter(3, 60_000);
  const t0 = Date.now();

  for (let i = 0; i < 3; i++) limiter.checkAndRecord('key-a', t0 + i);
  assert.equal(limiter.checkAndRecord('key-a', t0 + 3).limited, true);
  assert.equal(limiter.checkAndRecord('key-b', t0 + 3).limited, false);
});
