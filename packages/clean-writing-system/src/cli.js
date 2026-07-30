// Command line entry point.

import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

import { detect, TARGETS, TARGET_IDS, FALLBACK } from './targets.js';
import { buildPlan, SYSTEMS, selfVersion, LINT_PACKAGE } from './plan.js';
import { applyPlan } from './apply.js';
import { confirm, select, multiselect, isInteractive } from './prompt.js';

// Defaults live here so that --yes, a non-interactive run, and pressing enter
// at every prompt all produce the same result. They diverged once already.
export const DEFAULTS = {
  system: 'ste',
  withLint: true,
};

const ESC = String.fromCharCode(27);
const paint = (on) => (code, text) => (on ? `${ESC}[${code}m${text}${ESC}[0m` : text);

const USAGE = `
clean-writing-system init [options]

Vendor a writing system into this repository and point your AI coding agent
at it.

Options
  --system <name>    ste (default) or orwell
  --tools <list>     Comma separated: ${TARGET_IDS.join(', ')}. Default is what is detected
  --with-lint        Add the clean-writing-lint script, config, and devDependency (default)
  --no-lint          Leave package.json alone
  --dir <path>       Target repository. Default is the working directory
  --dry-run          Print the plan and change nothing
  --force            Overwrite files this tool owns, losing local edits
  --yes              Take the defaults and skip every prompt
  --no-color         Turn off ANSI color
  --help             Print this text

Examples
  npx clean-writing-system init
  npx clean-writing-system init --dry-run
  npx clean-writing-system init --system ste --tools claude,cursor --yes
`.trim();

function parseArgs(argv) {
  const options = {
    system: null,
    tools: null,
    withLint: null,
    dir: process.cwd(),
    dryRun: false,
    force: false,
    yes: false,
    color: process.stdout.isTTY && !process.env.NO_COLOR,
    command: null,
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
      case '--version':
      case '-v':
        return { version: true };
      case '--system': {
        const value = next();
        if (!SYSTEMS[value]) {
          throw new Error(`Unknown system: ${value}. Choose ste or orwell`);
        }
        options.system = value;
        break;
      }
      case '--tools': {
        const list = next().split(/[\s,]+/).filter(Boolean);
        const bad = list.filter((t) => !TARGET_IDS.includes(t));
        if (bad.length > 0) {
          throw new Error(
            `Unknown tool: ${bad.join(', ')}. Choose from ${TARGET_IDS.join(', ')}`,
          );
        }
        options.tools = list;
        break;
      }
      case '--with-lint':
        options.withLint = true;
        break;
      case '--no-lint':
        options.withLint = false;
        break;
      case '--dir':
        options.dir = resolve(next());
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--force':
        options.force = true;
        break;
      case '--yes':
      case '-y':
        options.yes = true;
        break;
      case '--no-color':
        options.color = false;
        break;
      default:
        if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
        if (options.command) throw new Error(`Unexpected argument: ${arg}`);
        options.command = arg;
    }
  }
  return options;
}

function describe(action, c) {
  const label = {
    create: c('32', 'create '),
    update: c('33', 'update '),
    skip: c('2', 'skip   '),
    conflict: c('31', 'CONFLICT'),
  }[action.kind];
  const note = action.note ? c('2', `  (${action.note})`) : '';
  return `  ${label} ${action.path}${note}`;
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
  if (options.version) {
    process.stdout.write(`${selfVersion()}\n`);
    return 0;
  }

  const command = options.command ?? 'init';
  if (command !== 'init') {
    process.stderr.write(`Unknown command: ${command}\n\n${USAGE}\n`);
    return 2;
  }

  const c = paint(options.color);
  const { dir } = options;
  if (!existsSync(dir)) {
    process.stderr.write(`No directory at ${dir}\n`);
    return 2;
  }

  const found = detect(dir);
  if (found.length > 0) {
    process.stdout.write(
      `Detected ${found.map((f) => `${f.label} (${f.evidence})`).join(', ')}\n\n`,
    );
  } else {
    process.stdout.write('No agent config found. AGENTS.md is the default.\n\n');
  }

  const interactive = isInteractive() && !options.yes;
  const detectedIds = found.length > 0 ? found.map((f) => f.id) : FALLBACK;

  let system = options.system ?? DEFAULTS.system;
  let tools = options.tools ?? detectedIds;
  let withLint = options.withLint ?? DEFAULTS.withLint;

  if (interactive) {
    if (!options.system) {
      system = await select(
        'Which writing system?',
        Object.values(SYSTEMS).map((s) => ({
          value: s.id,
          label: `${s.label} - ${s.blurb} (~${s.words} words)`,
        })),
        DEFAULTS.system,
      );
      process.stdout.write('\n');
    }
    if (!options.tools) {
      tools = await multiselect(
        'Wire up which tools?',
        TARGETS.map((t) => ({ value: t.id, label: `${t.label} -> ${t.writes}` })),
        detectedIds,
      );
      process.stdout.write('\n');
    }
    if (options.withLint === null) {
      withLint = await confirm(
        `Also add ${LINT_PACKAGE} for checking?`,
        DEFAULTS.withLint,
      );
      process.stdout.write('\n');
    }
  }

  if (tools.length === 0) {
    process.stderr.write('No tools selected, so there is nothing to point at the system.\n');
    return 2;
  }

  let actions;
  try {
    actions = buildPlan({ dir, system, tools, withLint, force: options.force });
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 2;
  }

  process.stdout.write(`${c('1', 'Plan')}\n`);
  for (const action of actions) process.stdout.write(`${describe(action, c)}\n`);
  process.stdout.write('\n');

  const conflicts = actions.filter((a) => a.kind === 'conflict');

  if (options.dryRun) {
    process.stdout.write(c('2', 'Dry run. Nothing was written.\n'));
    return conflicts.length > 0 ? 1 : 0;
  }

  if (conflicts.length > 0) {
    process.stderr.write(
      `${conflicts.length} file(s) already exist with different content.\n` +
        'Nothing was written. Review them, then re-run with --force to overwrite.\n',
    );
    return 1;
  }

  if (interactive && !(await confirm('Apply this plan?', true))) {
    process.stdout.write('Nothing was written.\n');
    return 0;
  }

  const result = applyPlan(dir, actions);
  process.stdout.write(
    `\n${c('32', 'Done.')} ${result.written.length} written, ${result.skipped.length} unchanged.\n`,
  );

  if (withLint) {
    process.stdout.write(
      `\nNext: ${c('1', 'npm install')} then ${c('1', 'npm run lint:prose')}\n`,
    );
  } else {
    process.stdout.write(
      `\n${c('2', `No linter added. Re-run with --with-lint to add ${LINT_PACKAGE}.`)}\n`,
    );
  }
  process.stdout.write(
    `Tell your agent to follow writing-systems/${system}.md, ` +
      'or just start asking it for docs.\n',
  );
  return 0;
}
