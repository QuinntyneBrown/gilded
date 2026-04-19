// Acceptance Test
// Traces to: L2-024
// Description: lint:ui rules catch bare HTML elements and color/font literals; production source passes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();

test('ESLint reports bare HTML elements in template fixture', () => {
  const result = spawnSync(
    'node_modules/.bin/eslint',
    ['tests/lint-fixtures/bare-elements.html'],
    { cwd: ROOT, encoding: 'utf8', shell: true },
  );
  assert.notEqual(result.status, 0,
    `Expected ESLint to fail on bare-elements.html.\nstdout: ${result.stdout}`);
});

test('Stylelint reports color/font literals in SCSS fixture', () => {
  const result = spawnSync(
    'node_modules/.bin/stylelint',
    ['tests/lint-fixtures/color-literals.scss', '--config', 'frontend/.stylelintrc.json'],
    { cwd: ROOT, encoding: 'utf8', shell: true },
  );
  assert.notEqual(result.status, 0,
    `Expected Stylelint to fail on color-literals.scss.\nstdout: ${result.stdout}`);
});

test('lint:ui passes on production source', () => {
  const result = spawnSync(
    'npm', ['run', 'lint:ui'],
    { cwd: ROOT, encoding: 'utf8', shell: true },
  );
  assert.equal(result.status, 0,
    `lint:ui should pass on production code.\nstderr: ${result.stderr}\nstdout: ${result.stdout}`);
});
