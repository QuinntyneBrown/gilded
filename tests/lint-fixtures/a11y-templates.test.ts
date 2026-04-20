// Acceptance Test
// Traces to: T-051
// Description: Static audit — every <img> has an alt attribute and every standalone
//              <mat-icon> (not inside a button) has aria-hidden="true".

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { globSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

function auditTemplate(content: string, file: string): string[] {
  const violations: string[] = [];
  const lines = content.split('\n');
  let insideInteractive = 0; // tracks open <button> and <a> elements

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const loc = `${file}:${i + 1}`;

    // <img> must have alt= or [alt]=
    if (line.includes('<img') && !/alt[=\]]/.test(line)) {
      violations.push(`${loc}: <img> missing alt attribute`);
    }

    // Standalone <mat-icon> (not inside a button or anchor) must have aria-hidden="true"
    if (line.includes('<mat-icon') && !line.includes('aria-hidden="true"')) {
      const iconIdx = line.indexOf('<mat-icon');
      const interactiveBeforeIcon = /<(?:button|a)\b/.test(line.substring(0, iconIdx));
      if (!interactiveBeforeIcon && insideInteractive <= 0) {
        violations.push(`${loc}: <mat-icon> missing aria-hidden="true" (standalone icon)`);
      }
    }

    // Track open/close interactive element depth (update after mat-icon check)
    insideInteractive += (line.match(/<(?:button|a)\b/g) ?? []).length;
    insideInteractive -= (line.match(/<\/(?:button|a)>/g) ?? []).length;
    insideInteractive = Math.max(0, insideInteractive);
  }

  return violations;
}

test('Angular templates: all <img> have alt, all standalone <mat-icon> have aria-hidden', () => {
  const templates = globSync('frontend/projects/gilded/src/**/*.component.html', { cwd: ROOT });
  assert.ok(templates.length > 0, 'No component templates found');

  const allViolations: string[] = [];
  for (const rel of templates) {
    const content = readFileSync(join(ROOT, rel), 'utf8');
    allViolations.push(...auditTemplate(content, rel));
  }

  assert.deepEqual(allViolations, [], `A11y template violations:\n${allViolations.join('\n')}`);
});
