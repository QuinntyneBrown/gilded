// Load test — T-053
// Usage: tsx scripts/load-test.ts
// Requires the backend to be running on http://localhost:3000
// Asserts: p95 <= 500ms, error rate < 0.5%

import autocannon, { type Result } from 'autocannon';

const P95_BUDGET_MS = 500;
const ERROR_RATE_BUDGET = 0.005;

async function run(): Promise<void> {
  const result = await new Promise<Result>((resolve, reject) => {
    const instance = autocannon({
      url: 'http://localhost:3000/api/counsellors?postal=L5A4E6',
      connections: 100,
      duration: 60,
      headers: { 'content-type': 'application/json' },
    });
    autocannon.track(instance, { renderProgressBar: true });
    instance.on('done', resolve);
    instance.on('error', reject);
  });

  const errorRate = result.errors / (result.requests.total || 1);
  const p95Ms = result.latency.p97_5;

  console.log('\nResults:');
  console.log(`  Total requests: ${result.requests.total}`);
  console.log(`  Errors: ${result.errors} (${(errorRate * 100).toFixed(2)}%)`);
  console.log(`  p95 latency: ${p95Ms}ms`);

  let failed = false;
  if (errorRate >= ERROR_RATE_BUDGET) {
    console.error(`✖ Error rate ${(errorRate * 100).toFixed(2)}% exceeds budget of ${ERROR_RATE_BUDGET * 100}%`);
    failed = true;
  }
  if (p95Ms > P95_BUDGET_MS) {
    console.error(`✖ p95 latency ${p95Ms}ms exceeds budget of ${P95_BUDGET_MS}ms`);
    failed = true;
  }
  if (!failed) console.log('✔ All performance budgets met');

  process.exit(failed ? 1 : 0);
}

run().catch((err) => { console.error(err); process.exit(1); });
