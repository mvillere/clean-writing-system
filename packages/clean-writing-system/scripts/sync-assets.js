#!/usr/bin/env node
// Copy the writing systems and the adapters into this package.
//
// The repository root holds the source of truth. npm cannot pack files from
// outside the package directory, so they are copied in before publish and
// checked for drift in CI. Never edit the copies under `assets/`.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = resolve(here, '..');
const root = resolve(pkg, '..', '..');

const COPIES = [
  ['writing-systems/ste.md', 'assets/systems/ste.md'],
  ['writing-systems/orwell.md', 'assets/systems/orwell.md'],
  ['adapters/claude-code/SKILL.md', 'assets/adapters/claude-code-skill.md'],
  ['adapters/cursor/clean-writing.mdc', 'assets/adapters/cursor-rule.mdc'],
];

/**
 * Turn the AGENTS.md adapter into the block that gets injected into a user's
 * file. Drops the title and the instructional comments, keeps the body from
 * the first section heading on.
 */
export function extractAgentsBlock(source) {
  const start = source.indexOf('\n## ');
  if (start === -1) {
    throw new Error('adapters/agents-md/AGENTS.md has no section heading');
  }
  return `${source.slice(start + 1).trimEnd()}\n`;
}

function write(target, contents) {
  mkdirSync(dirname(target), { recursive: true });
  const changed = !existsSync(target) || readFileSync(target, 'utf8') !== contents;
  if (changed) writeFileSync(target, contents, 'utf8');
  return changed;
}

export function sync({ check = false } = {}) {
  const drifted = [];

  for (const [from, to] of COPIES) {
    const source = readFileSync(join(root, from), 'utf8');
    const target = join(pkg, to);
    if (check) {
      if (!existsSync(target) || readFileSync(target, 'utf8') !== source) {
        drifted.push(to);
      }
    } else if (write(target, source)) {
      process.stdout.write(`  synced ${to}\n`);
    }
  }

  const block = extractAgentsBlock(
    readFileSync(join(root, 'adapters/agents-md/AGENTS.md'), 'utf8'),
  );
  const blockTarget = join(pkg, 'assets/adapters/agents-block.md');
  if (check) {
    if (!existsSync(blockTarget) || readFileSync(blockTarget, 'utf8') !== block) {
      drifted.push('assets/adapters/agents-block.md');
    }
  } else if (write(blockTarget, block)) {
    process.stdout.write('  synced assets/adapters/agents-block.md\n');
  }

  return drifted;
}

if (process.argv[1] && process.argv[1].endsWith('sync-assets.js')) {
  const check = process.argv.includes('--check');
  const drifted = sync({ check });
  if (check && drifted.length > 0) {
    process.stderr.write(
      'Assets are out of date. Run `npm run sync` in ' +
        'packages/clean-writing-system.\n' +
        drifted.map((f) => `  ${f}\n`).join(''),
    );
    process.exitCode = 1;
  } else if (check) {
    process.stdout.write('Assets are in sync.\n');
  }
}
