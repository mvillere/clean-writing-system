// Work out what would change, without changing anything.
//
// Every command builds a plan first. `--dry-run` prints it and stops. This is
// what makes the tool safe to run against a repository you care about.

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TARGETS } from './targets.js';
import { fence, upsertBlock, stamp, hasBlock } from './managed.js';

const here = dirname(fileURLToPath(import.meta.url));
const ASSETS = resolve(here, '..', 'assets');

export const LINT_PACKAGE = 'clean-writing-lint';
export const LINT_RANGE = '^0.1.0';

export const SYSTEMS = {
  ste: {
    id: 'ste',
    label: 'ste',
    blurb: 'Simplified Technical English. Full substitution tables, a core vocabulary, per-artifact rules',
    words: 1900,
  },
  orwell: {
    id: 'orwell',
    label: 'orwell',
    blurb: "Orwell's six rules. Short, cheap in context, weaker on vocabulary",
    words: 400,
  },
};

const asset = (...parts) => readFileSync(join(ASSETS, ...parts), 'utf8');

export function selfVersion() {
  const pkg = JSON.parse(readFileSync(resolve(here, '..', 'package.json'), 'utf8'));
  return pkg.version;
}

/** Detect the indent of an existing JSON file so an edit does not reformat it. */
export function detectIndent(source) {
  const found = /^[ \t]+/m.exec(source.replace(/^\{\s*\n/, ''));
  return found ? found[0] : '  ';
}

function classify(dir, path, contents, { owned = true, force = false } = {}) {
  const full = join(dir, path);
  if (!existsSync(full)) return { kind: 'create', path, contents };

  const current = readFileSync(full, 'utf8');
  if (current === contents) return { kind: 'skip', path, note: 'already up to date' };
  if (owned && !force) {
    return {
      kind: 'conflict',
      path,
      contents,
      note: 'exists with different content. Re-run with --force to overwrite',
    };
  }
  return { kind: 'update', path, contents };
}

/**
 * Build the list of actions.
 *
 * @param {object} options
 * @param {string} options.dir           target repository
 * @param {string} options.system        'ste' or 'orwell'
 * @param {string[]} options.tools       target ids
 * @param {boolean} [options.withLint]   add the linter script and config
 * @param {boolean} [options.force]      overwrite files we own
 * @returns {Array<object>} actions
 */
export function buildPlan({ dir, system, tools, withLint = false, force = false }) {
  const version = selfVersion();
  const actions = [];

  // 1. The writing system itself, vendored and stamped.
  const systemPath = `writing-systems/${system}.md`;
  const systemBody = stamp(asset('systems', `${system}.md`), { system, version });
  actions.push(classify(dir, systemPath, systemBody, { force }));

  // 2. One pointer per tool.
  for (const id of tools) {
    const target = TARGETS.find((t) => t.id === id);
    if (!target) throw new Error(`Unknown tool: ${id}`);

    if (id === 'claude') {
      const body = asset('adapters', 'claude-code-skill.md').replaceAll(
        'writing-systems/ste.md',
        systemPath,
      );
      actions.push(classify(dir, target.writes, body, { force }));
      continue;
    }

    if (id === 'cursor') {
      const body = asset('adapters', 'cursor-rule.mdc').replaceAll(
        'writing-systems/ste.md',
        systemPath,
      );
      actions.push(classify(dir, target.writes, body, { force }));
      continue;
    }

    // AGENTS.md belongs to the user. We own only the fenced region.
    const block = fence(
      asset('adapters', 'agents-block.md').replaceAll('writing-systems/ste.md', systemPath),
      { system, version },
    );
    const full = join(dir, 'AGENTS.md');
    const current = existsSync(full) ? readFileSync(full, 'utf8') : '';
    const next = upsertBlock(current, block);
    if (!current) {
      actions.push({ kind: 'create', path: 'AGENTS.md', contents: next });
    } else if (current === next) {
      actions.push({ kind: 'skip', path: 'AGENTS.md', note: 'block already current' });
    } else {
      actions.push({
        kind: 'update',
        path: 'AGENTS.md',
        contents: next,
        note: hasBlock(current) ? 'managed block replaced' : 'managed block added',
      });
    }
  }

  if (withLint) actions.push(...lintActions(dir, force));

  return actions;
}

function lintActions(dir, force) {
  const actions = [];
  const configPath = 'clean-writing.config.json';
  const config = `${JSON.stringify({ maxScore: 2 }, null, 2)}\n`;
  actions.push(classify(dir, configPath, config, { force }));

  const pkgPath = join(dir, 'package.json');
  if (!existsSync(pkgPath)) {
    actions.push({
      kind: 'skip',
      path: 'package.json',
      note: 'no package.json here, so no script was added',
    });
    return actions;
  }

  const source = readFileSync(pkgPath, 'utf8');
  const indent = detectIndent(source);
  const pkg = JSON.parse(source);
  const notes = [];

  pkg.scripts ??= {};
  if (!pkg.scripts['lint:prose']) {
    pkg.scripts['lint:prose'] = 'cwlint .';
    notes.push('+ scripts.lint:prose');
  }
  pkg.devDependencies ??= {};
  if (!pkg.devDependencies[LINT_PACKAGE] && !pkg.dependencies?.[LINT_PACKAGE]) {
    pkg.devDependencies[LINT_PACKAGE] = LINT_RANGE;
    notes.push(`+ devDependencies.${LINT_PACKAGE}`);
  }

  const next = `${JSON.stringify(pkg, null, indent)}\n`;
  actions.push(
    notes.length === 0
      ? { kind: 'skip', path: 'package.json', note: 'already configured' }
      : { kind: 'update', path: 'package.json', contents: next, note: notes.join(', ') },
  );
  return actions;
}
