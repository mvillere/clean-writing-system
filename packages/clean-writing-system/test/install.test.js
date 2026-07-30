import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildPlan, detectIndent, selfVersion } from '../src/plan.js';
import { applyPlan } from '../src/apply.js';
import { detect, FALLBACK } from '../src/targets.js';
import { main, DEFAULTS } from '../src/cli.js';
import { upsertBlock, hasBlock, fence, stamp, readStamp } from '../src/managed.js';
import { extractAgentsBlock, sync } from '../scripts/sync-assets.js';

const repo = (files = {}) => {
  const dir = mkdtempSync(join(tmpdir(), 'cws-'));
  for (const [path, contents] of Object.entries(files)) {
    const full = join(dir, path);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, contents, 'utf8');
  }
  return dir;
};

const read = (dir, path) => readFileSync(join(dir, path), 'utf8');
const kinds = (actions) => Object.fromEntries(actions.map((a) => [a.path, a.kind]));

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

test('detects Claude Code from a CLAUDE.md', () => {
  const dir = repo({ 'CLAUDE.md': '# hi\n' });
  assert.deepEqual(detect(dir).map((d) => d.id), ['claude']);
});

test('detects Cursor from a .cursor directory', () => {
  const dir = repo({ '.cursor/rules/other.mdc': 'x\n' });
  assert.deepEqual(detect(dir).map((d) => d.id), ['cursor']);
});

test('detects nothing in an empty repository, and AGENTS.md is the fallback', () => {
  assert.deepEqual(detect(repo()), []);
  assert.deepEqual(FALLBACK, ['agents']);
});

// ---------------------------------------------------------------------------
// Managed blocks
// ---------------------------------------------------------------------------

test('a block is appended to a file that has none', () => {
  const block = fence('## Writing style\n\nRules.', { system: 'ste', version: '1.0.0' });
  const out = upsertBlock('# AGENTS.md\n\n## Build\n\nRun it.\n', block);
  assert.match(out, /## Build/);
  assert.equal(out.match(/clean-writing-system:start/g).length, 1);
});

test('a second run replaces the block instead of appending another', () => {
  const first = fence('## Writing style\n\nOld.', { system: 'ste', version: '1.0.0' });
  const second = fence('## Writing style\n\nNew.', { system: 'ste', version: '2.0.0' });
  const once = upsertBlock('# AGENTS.md\n', first);
  const twice = upsertBlock(once, second);
  assert.equal(twice.match(/clean-writing-system:start/g).length, 1);
  assert.match(twice, /New\./);
  assert.doesNotMatch(twice, /Old\./);
});

test('text before and after the block survives a replacement', () => {
  const block = fence('## Writing style\n\nRules.', { system: 'ste', version: '1.0.0' });
  const start = upsertBlock('# AGENTS.md\n\n## Build\n\nRun it.\n', block);
  const withTail = `${start}\n## Deploy\n\nShip it.\n`;
  const again = upsertBlock(withTail, fence('## Writing style\n\nV2.', {
    system: 'ste',
    version: '2.0.0',
  }));
  assert.match(again, /## Build/);
  assert.match(again, /## Deploy/);
  assert.match(again, /V2\./);
});

test('hasBlock reports honestly', () => {
  assert.equal(hasBlock('# nothing here\n'), false);
  assert.equal(hasBlock(upsertBlock('', fence('x', { system: 'ste', version: '1' }))), true);
});

// ---------------------------------------------------------------------------
// Version stamps
// ---------------------------------------------------------------------------

test('a stamp goes after frontmatter, never before it', () => {
  const source = '---\nname: ste\n---\n\n# Title\n';
  const out = stamp(source, { system: 'ste', version: '1.2.3' });
  assert.ok(out.startsWith('---\n'), 'frontmatter must still start on line 1');
  assert.match(out, /---\n\n<!-- clean-writing-system: ste v1\.2\.3 -->\n\n# Title/);
});

test('a stamp goes on top when there is no frontmatter', () => {
  const out = stamp('# Title\n', { system: 'ste', version: '1.2.3' });
  assert.ok(out.startsWith('<!-- clean-writing-system: ste v1.2.3 -->'));
});

test('re-stamping replaces rather than accumulates', () => {
  const once = stamp('# Title\n', { system: 'ste', version: '1.0.0' });
  const twice = stamp(once, { system: 'ste', version: '2.0.0' });
  assert.equal(twice.match(/clean-writing-system:/g).length, 1);
  assert.deepEqual(readStamp(twice), { system: 'ste', version: '2.0.0' });
});

test('readStamp returns null when there is no stamp', () => {
  assert.equal(readStamp('# Title\n'), null);
});

// ---------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------

test('a fresh repository gets every file created', () => {
  const dir = repo();
  const plan = buildPlan({ dir, system: 'ste', tools: ['claude', 'cursor', 'agents'] });
  assert.deepEqual(kinds(plan), {
    'writing-systems/ste.md': 'create',
    '.claude/skills/clean-writing/SKILL.md': 'create',
    '.cursor/rules/clean-writing.mdc': 'create',
    'AGENTS.md': 'create',
  });
});

test('the plan writes nothing on its own', () => {
  const dir = repo();
  buildPlan({ dir, system: 'ste', tools: ['claude'] });
  assert.equal(existsSync(join(dir, 'writing-systems/ste.md')), false);
});

test('running twice is a no-op', () => {
  const dir = repo();
  const options = { dir, system: 'ste', tools: ['claude', 'agents'] };
  applyPlan(dir, buildPlan(options));
  const second = buildPlan(options);
  assert.deepEqual(
    [...new Set(second.map((a) => a.kind))],
    ['skip'],
    'every action should be a skip',
  );
});

test('a locally edited system file is a conflict, not an overwrite', () => {
  const dir = repo();
  const options = { dir, system: 'ste', tools: ['claude'] };
  applyPlan(dir, buildPlan(options));
  writeFileSync(join(dir, 'writing-systems/ste.md'), 'my own rules\n', 'utf8');

  const plan = buildPlan(options);
  assert.equal(kinds(plan)['writing-systems/ste.md'], 'conflict');

  applyPlan(dir, plan);
  assert.equal(read(dir, 'writing-systems/ste.md'), 'my own rules\n', 'edit must survive');
});

test('force turns a conflict into an update', () => {
  const dir = repo();
  const options = { dir, system: 'ste', tools: ['claude'] };
  applyPlan(dir, buildPlan(options));
  writeFileSync(join(dir, 'writing-systems/ste.md'), 'my own rules\n', 'utf8');

  const plan = buildPlan({ ...options, force: true });
  assert.equal(kinds(plan)['writing-systems/ste.md'], 'update');
  applyPlan(dir, plan);
  assert.match(read(dir, 'writing-systems/ste.md'), /Simplified Technical English/);
});

test('the orwell system can be installed instead', () => {
  const dir = repo();
  applyPlan(dir, buildPlan({ dir, system: 'orwell', tools: ['agents'] }));
  assert.match(read(dir, 'writing-systems/orwell.md'), /six rules/i);
  assert.match(read(dir, 'AGENTS.md'), /writing-systems\/orwell\.md/);
  assert.doesNotMatch(read(dir, 'AGENTS.md'), /writing-systems\/ste\.md/);
});

test('the vendored file carries a stamp matching this package version', () => {
  const dir = repo();
  applyPlan(dir, buildPlan({ dir, system: 'ste', tools: ['claude'] }));
  assert.deepEqual(readStamp(read(dir, 'writing-systems/ste.md')), {
    system: 'ste',
    version: selfVersion(),
  });
});

test('an unknown tool is rejected', () => {
  assert.throws(
    () => buildPlan({ dir: repo(), system: 'ste', tools: ['emacs'] }),
    /Unknown tool/,
  );
});

// ---------------------------------------------------------------------------
// package.json handling
// ---------------------------------------------------------------------------

test('indentation is detected so an edit does not reformat the file', () => {
  assert.equal(detectIndent('{\n    "a": 1\n}\n'), '    ');
  assert.equal(detectIndent('{\n  "a": 1\n}\n'), '  ');
  assert.equal(detectIndent('{\n\t"a": 1\n}\n'), '\t');
});

test('the lint script and dependency are added, keeping the existing indent', () => {
  const dir = repo({ 'package.json': '{\n    "name": "app",\n    "scripts": {\n        "build": "x"\n    }\n}\n' });
  applyPlan(dir, buildPlan({ dir, system: 'ste', tools: ['agents'], withLint: true }));
  const pkg = read(dir, 'package.json');
  assert.match(pkg, /\n    "name"/, 'four-space indent must be preserved');
  const parsed = JSON.parse(pkg);
  assert.equal(parsed.scripts.build, 'x', 'existing scripts must survive');
  assert.equal(parsed.scripts['lint:prose'], 'cwlint .');
  assert.ok(parsed.devDependencies['clean-writing-lint']);
});

test('an existing lint script is left alone', () => {
  const dir = repo({
    'package.json': JSON.stringify(
      { name: 'app', scripts: { 'lint:prose': 'my-own-command' } },
      null,
      2,
    ),
  });
  const plan = buildPlan({ dir, system: 'ste', tools: ['agents'], withLint: true });
  const pkgAction = plan.find((a) => a.path === 'package.json');
  assert.equal(pkgAction.kind, 'update');
  applyPlan(dir, plan);
  assert.equal(JSON.parse(read(dir, 'package.json')).scripts['lint:prose'], 'my-own-command');
});

test('a repository with no package.json is reported, not crashed on', () => {
  const dir = repo();
  const plan = buildPlan({ dir, system: 'ste', tools: ['agents'], withLint: true });
  const pkgAction = plan.find((a) => a.path === 'package.json');
  assert.equal(pkgAction.kind, 'skip');
  assert.match(pkgAction.note, /no package\.json/);
});

// ---------------------------------------------------------------------------
// Defaults must not diverge between paths
// ---------------------------------------------------------------------------

test('--yes wires up the linter, the same as pressing enter at the prompt', async () => {
  const dir = repo({ 'package.json': '{\n  "name": "app"\n}\n' });
  const code = await main(['init', '--yes', '--no-color', '--dir', dir]);
  assert.equal(code, 0);
  assert.equal(
    JSON.parse(read(dir, 'package.json')).scripts['lint:prose'],
    'cwlint .',
    '--yes must take the default, and the default is yes',
  );
  assert.ok(existsSync(join(dir, 'clean-writing.config.json')));
});

test('--no-lint opts out and leaves package.json untouched', async () => {
  const original = '{\n  "name": "app"\n}\n';
  const dir = repo({ 'package.json': original });
  await main(['init', '--yes', '--no-lint', '--no-color', '--dir', dir]);
  assert.equal(read(dir, 'package.json'), original);
  assert.equal(existsSync(join(dir, 'clean-writing.config.json')), false);
});

test('the documented default for the linter is on', () => {
  assert.equal(DEFAULTS.withLint, true);
  assert.equal(DEFAULTS.system, 'ste');
});

test('--dry-run writes nothing at all', async () => {
  const dir = repo({ 'package.json': '{\n  "name": "app"\n}\n' });
  const before = read(dir, 'package.json');
  await main(['init', '--yes', '--dry-run', '--no-color', '--dir', dir]);
  assert.equal(read(dir, 'package.json'), before);
  assert.equal(existsSync(join(dir, 'writing-systems')), false);
});

// ---------------------------------------------------------------------------
// Asset sync
// ---------------------------------------------------------------------------

test('the bundled assets match the repository source of truth', () => {
  assert.deepEqual(sync({ check: true }), [], 'run `npm run sync` in this package');
});

test('the AGENTS block extraction drops the title and the instructions', () => {
  const block = extractAgentsBlock(
    '# AGENTS.md\n\n<!-- Copy this. -->\n\n## Writing style\n\nRules.\n',
  );
  assert.ok(block.startsWith('## Writing style'));
  assert.doesNotMatch(block, /Copy this/);
});
