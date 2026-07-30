# AGENTS.md

This repository holds writing systems for AI coding agents. It uses its own
system on itself.

## Writing style

Follow the rules in `writing-systems/ste.md` for all prose you write or edit in
this repository, including this file.

Prose means README files, documentation, code comments, docstrings, error
messages, commit messages, pull request bodies, and release notes. It does not
mean code, identifiers, command syntax, or the contents of code blocks.

Use strict mode for error messages and log lines. Use flavored mode for
documents. Run the self-check at the end of `ste.md` before you return any text.

## Rules for this repository

`writing-systems/ste.md` is the single source of truth. The files under
`adapters/` point at it. They do not copy the rules. If you change a rule,
change it in `ste.md` only.

`packages/clean-writing-system/assets/` holds generated copies of the writing
systems and the adapters. Never edit them. Run `npm run sync` in that package
after you change a source file. CI fails when they drift.

The files in `writing-systems/` must obey themselves. A style guide that breaks
its own rules is worth nothing.

The delete lists in `ste.md` name the words they ban. A linter reads those names
as violations. Do not "fix" them.

Run the linter before you finish. The repository must score 0.00.

```
node packages/clean-writing-lint/bin/cwlint.js .
```

When a rule fires on text that quotes the rule, add a suppression comment. Do
not weaken the rule and do not reword the quotation.

Keep the credit line at the end of `ste.md`. The file is MIT and derived from
MIT work, so the notice travels with every copy.
