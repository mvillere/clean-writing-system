# clean-writing-system

Drop-in writing rules for AI coding agents. Copy one markdown file into your
repository, add one pointer line, and the agent stops writing docs that sound
like a press release.

It covers prose only: README files, documentation, code comments, docstrings,
error messages, commit messages, pull request bodies, and release notes. It
never touches code.

## What it fixes

Same prompt, same model. The first version is the default. The second uses the
rules in this repository. Both samples come from
[Ege Çelebi's test data](https://github.com/woosal1337/blog/tree/main/videos/ep01-the-cure-for-ai-slop).

<!-- cws-disable -->
<!-- The sample below is the slop. Leave it exactly as it is. -->

**Before:**

> Traditional caches miss constantly in LLM workloads because users rarely
> phrase the same question identically — fluxcache solves this by embedding
> incoming prompts and matching them against previously cached queries within a
> configurable similarity threshold. It ships with sensible defaults so you can
> get semantic caching running in a few lines of code, while exposing the knobs
> that real applications need as they scale.

<!-- cws-enable -->

**After:**

> A normal cache matches requests by exact text. A small change in wording then
> causes a cache miss. fluxcache compares the meaning of a new prompt with the
> prompts already in the cache. If two prompts are close enough in meaning,
> fluxcache returns the stored response instead of a new call to the model. This
> lowers the number of calls to the model and cuts the cost and response time of
> the application.

<!-- cws-disable-next-line marketing-adjective -->
Same facts. No em dash, no "sensible defaults", no 30-word opening sentence.

Error messages change the most:

```
BAD:  An error occurred while processing your request. Please try again later.
GOOD: The upload failed. The file is 82 MB and the limit is 25 MB.
      Split the file or raise the limit in settings.
```

## Install

Every path is the same two steps. Copy the system file, then point your agent at
it.

### Claude Code

```bash
mkdir -p writing-systems .claude/skills/clean-writing
curl -o writing-systems/ste.md https://raw.githubusercontent.com/mvillere/clean-writing-system/main/writing-systems/ste.md
curl -o .claude/skills/clean-writing/SKILL.md https://raw.githubusercontent.com/mvillere/clean-writing-system/main/adapters/claude-code/SKILL.md
```

The skill loads only when you ask for docs, comments, or an error message. It
costs nothing on other turns.

To apply the rules on every turn instead, skip the skill and add this line to
`CLAUDE.md`:

```markdown
Follow the writing rules in `writing-systems/ste.md` for all prose.
```

### Cursor

```bash
mkdir -p writing-systems .cursor/rules
curl -o writing-systems/ste.md https://raw.githubusercontent.com/mvillere/clean-writing-system/main/writing-systems/ste.md
curl -o .cursor/rules/clean-writing.mdc https://raw.githubusercontent.com/mvillere/clean-writing-system/main/adapters/cursor/clean-writing.mdc
```

The rule ships with `alwaysApply: false` and a description, so Cursor pulls it in
when the task is prose. Set `alwaysApply: true` if you want it on every
request. The `globs` field auto-attaches it for `.md` files and `docs/`.

### Codex, Grok, Copilot, Gemini CLI, Zed, Windsurf, Aider

All of these read `AGENTS.md`. Copy `writing-systems/ste.md` into your
repository, then paste the block from
[`adapters/agents-md/AGENTS.md`](adapters/agents-md/AGENTS.md) into the
`AGENTS.md` at your repository root.

Cursor reads `AGENTS.md` too, so this path works there as well if you would
rather keep one file than two.

### Anything else

Paste the whole of `writing-systems/ste.md` into whatever system prompt or rules
file your tool uses. The file is self-contained by design. It has no
dependencies and it needs no runtime.

## Check the result

The style guide tells the agent how to write. The linter tells you whether it
did.

```bash
npx clean-writing-lint README.md docs
```

```
README.md
  22:14  warn  marketing-adjective   "seamless" is a marketing claim. Delete it, or replace it with a measurement.
  31:1   warn  long-sentence         Sentence is 34 words. The limit is 20.
  2 violations, 966 words, score 0.31 per 100 words
```

Score is violations per 100 words. Lower is cleaner. Lint a draft, apply the
style guide, then lint it again. The delta is the signal.

Add `--max-score 2` to fail a build. See
[`packages/clean-writing-lint`](packages/clean-writing-lint) for the rules, the
config file, and the suppression comments.

This repository runs the linter on itself in CI, on Windows as well as Linux,
and scores 0.00.

## The two systems

| File | Words | Use it when |
|---|---|---|
| [`writing-systems/ste.md`](writing-systems/ste.md) | ~1900 | You want rules a machine can check. Full substitution tables, a core vocabulary, per-artifact rules for comments and error messages |
| [`writing-systems/orwell.md`](writing-systems/orwell.md) | ~400 | You want judgment and a short checklist. Six rules, cheap in context, weaker on vocabulary |

Use `ste.md` unless context budget is tight. Çelebi's cross-model test scored
them close on GPT and gave STE a clear win on Claude, so the short file is a real
option, not a consolation prize.

You can use both. `orwell.md` ends with a pointer to `ste.md`, and rule 6 of
Orwell is the escape hatch that `ste.md` needs: if a sentence obeys every rule
and still reads badly, break the rule.

## Why a file and not an npm package

An agent control file has to reach the context window. `node_modules` is in
`.gitignore` and no agent reads it, so a package that installs there puts the
rules where nothing looks.

Vendoring also gets you the thing a package takes away. Every team wants to add
its own banned words and its own glossary of technical names. When the file sits
in your repository, that edit is a normal pull request that a reviewer can see.

A linter is the part that does want to be a dependency, and that part ships as
one. See [`packages/clean-writing-lint`](packages/clean-writing-lint). The style
guide is a copy. The checker is a package.

## What this does not do

It fixes the form of bad writing. It does not fix the substance. A paragraph can
pass every rule in `ste.md` and still be empty or wrong. Check the facts
yourself.

It also strips voice. That is the point for docs and error messages, and it is
the wrong tool for a blog post or a landing page.

One more trap, found while building this. A style guide has to name the words it
bans, so a linter reads the guide itself as full of violations. The linter here
takes suppression comments for that reason. Any other checker you point at these
files needs the same escape hatch.

## Roadmap

This repository is a shared knowledge base and a place to test ideas. Current
plan:

- [x] A Node port of the anti-slop linter, with suppression comments and a CI
      score threshold. Çelebi's original is Python, which is a second toolchain
      in a JavaScript repository
- [ ] `npx clean-writing-system add ste` to copy the file and write the pointer
      line for the tool it detects
- [ ] A wider benchmark. Çelebi ran 6 tasks against 2 models. Running these files
      at higher n, across Claude, GPT, Gemini, and Grok, would say which system
      works where
- [ ] A glossary template for technical names, since the "one name for one thing"
      rule needs a place to record the names

## Credit

The STE rules come from [Ege Çelebi](https://github.com/woosal1337) and his
[`ste-writing-skill.md`](https://github.com/woosal1337/blog/tree/main/videos/ep01-the-cure-for-ai-slop),
MIT licensed. He distilled ASD-STE100 into an agent skill, ran the
first cross-model test of whether it works, and published the linter and the raw
results. The rule categories, the two-mode split, and the self-check in
`ste.md` follow his file.

His numbers, in anti-slop violations per 100 words. Lower is cleaner:

| Condition | Claude Sonnet | gpt-5.5 |
|---|---|---|
| baseline | 4.36 | 3.54 |
| banned-words list | 4.21 (−3%) | 2.14 (−40%) |
| Orwell's 6 rules | 2.48 (−43%) | 1.69 (−52%) |
| STE skill | **1.12 (−74%)** | 1.76 (−50%) |

He is honest that the striking result, that banning words does almost nothing,
holds on Claude and not on GPT. Read his
[experiment write-up](https://github.com/woosal1337/blog/blob/main/videos/ep01-the-cure-for-ai-slop/experiment-results.md)
for the caveats.

What this repository adds:

- a core vocabulary and substitution tables, because his skill refers to a
  900-word dictionary that it does not ship
- a list of banned constructions
- separate rules for comments, error messages, commits, and changelogs
- install paths for the tools people run
- a linter that knows a style guide has to quote the words it bans

The six rules in `orwell.md` come from "Politics and the English Language" by
George Orwell, 1946.

ASD-STE100 is free to read at [asd-ste100.org](https://asd-ste100.org) and it is
copyrighted. Nothing here reproduces it.

## License

MIT. See [LICENSE](LICENSE), which carries the upstream notice as well.
