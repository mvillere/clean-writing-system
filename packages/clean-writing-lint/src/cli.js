// Command line entry point.
//
// Every file is read as UTF-8. This is deliberate. The Python linter this port
// is based on omits the encoding, so on a Windows default locale it silently
// misses every em dash. See UPSTREAM_BUG.md in the repository root.

import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join, relative, extname, sep } from 'node:path';
import { lint } from './lint.js';
import { findConfig, loadConfig, resolveConfig, RULE_IDS } from './config.js';
import { pretty, json, compact } from './report.js';

const USAGE = `
cwlint [options] <file|directory>...

Lint prose for AI slop. Reports violations per 100 words. Lower is cleaner.

Options
  --max-score <n>     Exit 1 when the total score is above n
  --format <name>     pretty (default), json, or compact
  --config <path>     Config file to use instead of searching upward
  --rule <id=level>   Override one rule: error, warn, or off. Repeatable
  --stdin             Read from standard input instead of files
  --quiet             Hide files that have no violations
  --no-color          Turn off ANSI color
  --list-rules        Print the rule ids and exit
  --help              Print this text

Suppression, written as an HTML comment in the source
  <!-- cws-disable-file [rules] -->
  <!-- cws-disable [rules] -->   ...   <!-- cws-enable -->
  <!-- cws-disable-next-line [rules] -->
  <!-- cws-disable-line [rules] -->

Exit codes
  0  clean, or only warnings with no score limit set
  1  score above --max-score, or a rule set to error fired
  2  bad usage or an unreadable file
`.trim();

/** Walk a path into a list of lintable files. */
export function collectFiles(target, config) {
  const skip = (path) =>
    config.ignore.some((fragment) => path.split(sep).join('/').includes(fragment));

  const stats = statSync(target);
  if (stats.isFile()) return skip(target) ? [] : [target];
  if (!stats.isDirectory()) return [];

  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (skip(path)) continue;
      if (entry.isDirectory()) walk(path);
      else if (config.extensions.includes(extname(entry.name))) found.push(path);
    }
  };
  walk(target);
  return found.sort();
}

/** Lint a list of files. Returns one result per file. */
export function lintFiles(paths, config) {
  return paths.map((path) => {
    const raw = readFileSync(path, 'utf8');
    return {
      file: relative(process.cwd(), path).split(sep).join('/') || path,
      ...lint(raw, config),
    };
  });
}

function parseArgs(argv) {
  const options = {
    targets: [],
    maxScore: undefined,
    format: 'pretty',
    configPath: null,
    ruleOverrides: {},
    stdin: false,
    quiet: false,
    color: process.stdout.isTTY && !process.env.NO_COLOR,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (value === undefined) throw new Error(`${arg} needs a value`);
      i += 1;
      return value;
    };

    switch (arg) {
      case '--help':
      case '-h':
        return { help: true };
      case '--list-rules':
        return { listRules: true };
      case '--max-score':
        options.maxScore = Number(next());
        if (Number.isNaN(options.maxScore)) throw new Error('--max-score needs a number');
        break;
      case '--format':
        options.format = next();
        break;
      case '--config':
        options.configPath = next();
        break;
      case '--rule': {
        const [id, level] = next().split('=');
        if (!RULE_IDS.includes(id)) throw new Error(`Unknown rule: ${id}`);
        if (!['error', 'warn', 'off'].includes(level)) {
          throw new Error(`Level for ${id} must be error, warn, or off`);
        }
        options.ruleOverrides[id] = level;
        break;
      }
      case '--stdin':
        options.stdin = true;
        break;
      case '--quiet':
        options.quiet = true;
        break;
      case '--no-color':
        options.color = false;
        break;
      default:
        if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
        options.targets.push(arg);
    }
  }
  return options;
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

export async function main(argv) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    process.stderr.write(`${error.message}\n\n${USAGE}\n`);
    return 2;
  }

  if (options.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  if (options.listRules) {
    process.stdout.write(`${RULE_IDS.join('\n')}\n`);
    return 0;
  }
  if (!options.stdin && options.targets.length === 0) {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }

  let userConfig = {};
  try {
    userConfig = options.configPath
      ? await loadConfig(options.configPath)
      : (await findConfig(process.cwd())).value;
  } catch (error) {
    process.stderr.write(`Cannot read the config: ${error.message}\n`);
    return 2;
  }

  let config;
  try {
    config = resolveConfig({
      ...userConfig,
      rules: { ...(userConfig.rules ?? {}), ...options.ruleOverrides },
    });
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 2;
  }

  const maxScore = options.maxScore ?? config.maxScore ?? null;

  let results;
  try {
    if (options.stdin) {
      results = [{ file: '<stdin>', ...lint(readStdin(), config) }];
    } else {
      const paths = options.targets.flatMap((t) => collectFiles(t, config));
      if (paths.length === 0) {
        process.stderr.write('No files matched.\n');
        return 2;
      }
      results = lintFiles(paths, config);
    }
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 2;
  }

  const formats = { pretty, json, compact };
  const format = formats[options.format];
  if (!format) {
    process.stderr.write(`Unknown format: ${options.format}\n`);
    return 2;
  }

  const output =
    options.format === 'pretty'
      ? pretty(results, { color: options.color, quiet: options.quiet, maxScore })
      : format(results);
  process.stdout.write(`${output}\n`);

  const totalWords = results.reduce((sum, r) => sum + r.words, 0);
  const totalViolations = results.reduce((sum, r) => sum + r.violations.length, 0);
  const score = totalWords > 0 ? (totalViolations * 100) / totalWords : 0;
  const errors = results.reduce((sum, r) => sum + r.errorCount, 0);

  if (errors > 0) return 1;
  if (maxScore !== null && score > maxScore) return 1;
  return 0;
}
