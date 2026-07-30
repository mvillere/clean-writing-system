# clean-writing-system

Install a writing system for AI coding agents into your repository. Copies the
style guide in, then points Claude Code, Cursor, or AGENTS.md at it.

```bash
npx clean-writing-system init
```

No dependencies. Node 18 or later. Nothing to keep installed.

## What it does

```
Detected Claude Code (.claude), Cursor (.cursor)

? Which writing system?     ste
? Wire up which tools?      Claude Code, Cursor
? Also add the linter?      yes

Plan
  create  writing-systems/ste.md
  create  .claude/skills/clean-writing/SKILL.md
  create  .cursor/rules/clean-writing.mdc
  create  clean-writing.config.json
  update  package.json  (+ scripts.lint:prose, + devDependencies.clean-writing-lint)

Done. 5 written, 0 unchanged.
```

The style guide lands in your repository as a normal file. You own it, you can
edit it, and a reviewer sees your changes in a diff. That is the point. A rules
file inside `node_modules` never reaches the agent, because `node_modules` is in
`.gitignore` and no agent reads it.

## Options

```
--system <name>    ste (default) or orwell
--tools <list>     claude, cursor, agents. Default is what it detects
--with-lint        Add the clean-writing-lint script, config, and devDependency
--dir <path>       Target repository. Default is the working directory
--dry-run          Print the plan and change nothing
--force            Overwrite files this tool owns, losing local edits
--yes              Take the defaults and skip every prompt
```

Look before you leap:

```bash
npx clean-writing-system init --dry-run
```

Scripted, with no prompts:

```bash
npx clean-writing-system init --system ste --tools claude,cursor --yes
```

## What it writes

| Tool | File |
|---|---|
| Claude Code | `.claude/skills/clean-writing/SKILL.md` |
| Cursor | `.cursor/rules/clean-writing.mdc` |
| Codex, Copilot, Gemini CLI, Zed, Windsurf, Aider | a managed block in `AGENTS.md` |

For Claude Code it writes a skill, not a line in `CLAUDE.md`. A skill loads only
when the task is prose, so the rules cost nothing on every other turn.

Detection proposes and never decides. It reads `.claude/`, `CLAUDE.md`,
`.cursor/`, `.cursorrules`, and `AGENTS.md`. When it finds none of them it
suggests `AGENTS.md`, which reaches the most tools for one file. Override it all
with `--tools`.

## Running it twice is safe

Two rules make this true.

**This tool never overwrites a file it owns in silence.** If
`writing-systems/ste.md` differs from the copy it would write, the run stops and
reports a conflict. Your edits survive. Pass `--force` when you do want the
upstream copy back.

**`AGENTS.md` belongs to you, so this tool manages one fenced region inside it:**

```markdown
<!-- clean-writing-system:start -->
## Writing style
Follow the rules in `writing-systems/ste.md` for all prose you write or edit.
<!-- clean-writing-system:end -->
```

A second run replaces what is between the markers. It leaves your other sections
alone, wherever they sit in the file.

The vendored guide also carries a version stamp, so you can always tell which
release it came from:

```markdown
<!-- clean-writing-system: ste v0.1.0 -->
```

## The two systems

| System | Words | Use it when |
|---|---|---|
| `ste` | ~1900 | You want rules a machine can check. Substitution tables, a core vocabulary, per-artifact rules for comments and error messages |
| `orwell` | ~400 | You want judgment and a short checklist. Cheap in context, weaker on vocabulary |

Take `ste` unless context budget is tight.

## Checking the result

The style guide tells the agent how to write.
[`clean-writing-lint`](https://www.npmjs.com/package/clean-writing-lint) tells
you whether it did. `--with-lint` wires it up in one step.

## Use it from code

```js
import { buildPlan, applyPlan, detect } from 'clean-writing-system';

const plan = buildPlan({ dir: process.cwd(), system: 'ste', tools: ['claude'] });
console.log(plan.map((a) => `${a.kind} ${a.path}`));
applyPlan(process.cwd(), plan);
```

`buildPlan` never touches the disk. Only `applyPlan` writes.

## Credit

The style guide it installs comes from `ste-writing-skill.md` by Ege Çelebi, MIT,
which distills ASD-STE100 Simplified Technical English. Full credit, his
cross-model test results, and what this project adds are in the
[repository README](https://github.com/mvillere/clean-writing-system).

MIT.
