---
name: clean-writing
description: Write and edit prose in Simplified Technical English. Covers READMEs, documentation, code comments, docstrings, error messages, commit messages, pull request bodies, and release notes. Use when asked to write or edit any of those, to make writing plain, to remove AI slop, or to follow the house writing style. Never applies to code itself.
---

# clean-writing

Read `writing-systems/ste.md` in the repository root and follow every rule in
it. If you cannot find that file, look in
`.claude/skills/clean-writing/ste.md`.

Apply the rules to prose only. Do not apply them to code, identifiers, command
syntax, or the contents of code blocks.

Pick the mode from the artifact:

- **strict** for error messages, warnings, log lines, and runbooks
- **flavored** for README files, documentation, pull request bodies, and
  changelogs

Run the self-check in `ste.md` before you return the text.
