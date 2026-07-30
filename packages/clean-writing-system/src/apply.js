// Carry out a plan.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Write every create and update in the plan. Skips and conflicts are left
 * alone, so a conflict never destroys a file.
 *
 * @returns {{ written: string[], skipped: string[], conflicts: string[] }}
 */
export function applyPlan(dir, actions) {
  const written = [];
  const skipped = [];
  const conflicts = [];

  for (const action of actions) {
    if (action.kind === 'skip') {
      skipped.push(action.path);
      continue;
    }
    if (action.kind === 'conflict') {
      conflicts.push(action.path);
      continue;
    }
    const full = join(dir, action.path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, action.contents, 'utf8');
    written.push(action.path);
  }

  return { written, skipped, conflicts };
}
