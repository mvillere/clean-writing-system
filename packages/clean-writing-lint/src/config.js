// Configuration loading and merging.
//
// Config is flat and additive. A project extends a word list with `add` and
// trims it with `remove`, so nobody has to restate a default list to change one
// entry.

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const RULE_IDS = [
  'long-sentence',
  'long-paragraph',
  'semicolon',
  'em-dash',
  'exclamation',
  'emoji',
  'contraction',
  'passive-voice',
  'ing-main-verb',
  'nominalization',
  'phrasal-verb',
  'banned-word',
  'marketing-adjective',
  'filler',
  'intensifier',
  'banned-construction',
];

export const DEFAULT_CONFIG = {
  // Fail the run above this many violations per 100 words. null disables it.
  maxScore: null,
  maxSentenceWords: 20,
  maxDescriptiveWords: 25,
  maxParagraphSentences: 6,
  // Table cells and code are not sentences. Blockquotes usually are.
  lintTables: false,
  lintBlockquotes: true,
  // Rule severity: "error", "warn", or "off".
  rules: {},
  defaultSeverity: 'warn',
  // Extend or trim the word lists.
  marketingAdjectives: { add: [], remove: [] },
  bannedWords: { add: [], remove: [] },
  phrasalVerbs: { add: [], remove: [] },
  filler: { add: [], remove: [] },
  intensifiers: { add: [], remove: [] },
  passiveIgnore: { add: [], remove: [] },
  // Glob-free path fragments to skip.
  ignore: ['node_modules', '.git', 'CHANGELOG.md'],
  extensions: ['.md', '.mdx', '.markdown'],
};

const CONFIG_NAMES = [
  'clean-writing.config.js',
  'clean-writing.config.mjs',
  'clean-writing.config.json',
  '.cleanwritingrc.json',
  '.cleanwritingrc',
];

/** Walk up from `startDir` looking for a config file or a package.json key. */
export async function findConfig(startDir) {
  let dir = resolve(startDir);

  for (;;) {
    for (const name of CONFIG_NAMES) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) {
        return { path: candidate, value: await readConfigFile(candidate) };
      }
    }

    const pkgPath = join(dir, 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      if (pkg.cleanWriting) {
        return { path: pkgPath, value: pkg.cleanWriting };
      }
    }

    const parent = dirname(dir);
    if (parent === dir) return { path: null, value: {} };
    dir = parent;
  }
}

/** Load one named config file. Used by `--config`. */
export async function loadConfig(path) {
  if (!existsSync(path)) throw new Error(`No config file at ${path}`);
  return readConfigFile(resolve(path));
}

async function readConfigFile(path) {
  if (path.endsWith('.js') || path.endsWith('.mjs')) {
    const module = await import(pathToFileURL(path).href);
    return module.default ?? module.config ?? {};
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

function mergeList(name, user) {
  const patch = user[name] ?? {};
  return {
    add: Array.isArray(patch.add) ? patch.add : [],
    remove: Array.isArray(patch.remove) ? patch.remove : [],
  };
}

/** Merge user config over the defaults. Unknown keys are ignored. */
export function resolveConfig(user = {}) {
  const unknownRules = Object.keys(user.rules ?? {}).filter(
    (id) => !RULE_IDS.includes(id),
  );
  if (unknownRules.length > 0) {
    throw new Error(
      `Unknown rule in config: ${unknownRules.join(', ')}.\n` +
        `Valid rules: ${RULE_IDS.join(', ')}`,
    );
  }

  return {
    ...DEFAULT_CONFIG,
    ...user,
    rules: { ...DEFAULT_CONFIG.rules, ...(user.rules ?? {}) },
    marketingAdjectives: mergeList('marketingAdjectives', user),
    bannedWords: mergeList('bannedWords', user),
    phrasalVerbs: mergeList('phrasalVerbs', user),
    filler: mergeList('filler', user),
    intensifiers: mergeList('intensifiers', user),
    passiveIgnore: mergeList('passiveIgnore', user),
    ignore: user.ignore ?? DEFAULT_CONFIG.ignore,
    extensions: user.extensions ?? DEFAULT_CONFIG.extensions,
  };
}

/** Apply an add/remove patch to a base list, case-insensitively. */
export function patchList(base, patch) {
  const removed = new Set((patch.remove ?? []).map((w) => w.toLowerCase()));
  const kept = base.filter((w) => !removed.has(w.toLowerCase()));
  const seen = new Set(kept.map((w) => w.toLowerCase()));
  for (const word of patch.add ?? []) {
    if (!seen.has(word.toLowerCase())) {
      kept.push(word);
      seen.add(word.toLowerCase());
    }
  }
  return kept;
}
