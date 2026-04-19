import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { evaluate, REASON_PROFANITY, REASON_TOO_MANY_LINKS, REASON_ALL_CAPS } from './ruleset.ts';

test('clean text → allow', () => {
  assert.deepEqual(evaluate('This counsellor was very helpful and I recommend them.'), { verdict: 'allow', reason: null });
});

test('profanity → reject with stable reason', () => {
  const result = evaluate('This is damn awful garbage crap.');
  assert.equal(result.verdict, 'reject');
  assert.equal(result.reason, REASON_PROFANITY);
});

test('4 or more links → reject', () => {
  const text = 'Visit https://a.com https://b.com https://c.com https://d.com for more info.';
  const result = evaluate(text);
  assert.equal(result.verdict, 'reject');
  assert.equal(result.reason, REASON_TOO_MANY_LINKS);
});

test('3 links → allow (below threshold)', () => {
  const text = 'Visit https://a.com https://b.com https://c.com for more info.';
  assert.equal(evaluate(text).verdict, 'allow');
});

test('all-caps text longer than 20 chars → flag', () => {
  const result = evaluate('THIS IS A VERY LONG ALL CAPS REVIEW');
  assert.equal(result.verdict, 'flag');
  assert.equal(result.reason, REASON_ALL_CAPS);
});

test('all-caps text 20 chars or fewer → allow', () => {
  assert.equal(evaluate('SHORT CAPS TEXT').verdict, 'allow');
});
