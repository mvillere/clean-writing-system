# clean-writing-lint

Check prose for AI slop. Reports violations per 100 words. Lower is cleaner.

This is the machine-checkable part of
[`writing-systems/ste.md`](../../writing-systems/ste.md). The style guide tells
an agent how to write. This tells you whether it did.

No dependencies. Node 18 or later.

## Use it

```bash
npx clean-writing-lint README.md docs
```

Or add it to a project:

```bash
npm install --save-dev clean-writing-lint
```

```json
{
  "scripts": {
    "lint:prose": "cwlint --max-score 2 README.md docs"
  }
}
```

The command exits 1 when the score goes above `--max-score`, so it works as a
gate in CI. It also exits 1 when a rule set to `error` fires.

Point it at a file or a directory. It walks a directory for `.md`, `.mdx`, and
`.markdown` files. Read from standard input with `--stdin`.

## What it reports

```
README.md
  22:14  warn  marketing-adjective   "seamless" is a marketing claim. Delete it, or replace it with a measurement.
  31:1   warn  long-sentence         Sentence is 34 words. The limit is 20.
  47:9   warn  passive-voice         Passive voice with a named actor: "is read by". Make it active.
  3 violations, 966 words, score 0.31 per 100 words
```

Rules:

| Rule | What it catches |
|---|---|
| `long-sentence` | More than 20 words in one sentence |
| `long-paragraph` | More than 6 sentences in one paragraph |
| `semicolon` | Semicolons |
| `em-dash` | Em dashes and en dashes |
| `exclamation` | Exclamation marks |
| `emoji` | Emoji in prose |
| `contraction` | Real contractions, not possessives |
| `passive-voice` | "to be" plus a past participle |
| `ing-main-verb` | "is sending" where "sends" works |
| `nominalization` | "perform an analysis" for "analyze" |
| `phrasal-verb` | "spin up", "reach out", "circle back" |
| `banned-word` | utilize, leverage, prior to, in order to |
| `marketing-adjective` | seamless, robust, world-class |
| `filler` | "it is important to note that" |
| `intensifier` | very, really, simply, actually |
| `banned-construction` | "It is not just X, it is Y", "let us dive in" |

Run `cwlint --list-rules` for the current list.

It never lints code. It masks out fenced blocks, inline code, frontmatter, link
targets, URLs, HTML tags, and table rows first. Masking replaces the
region with spaces of the same length, so every line and column in the report
points at the real source.

## Suppress a rule

A style guide has to name the words it bans. So do release notes that quote a
bad error message. Write an HTML comment:

```markdown
<!-- cws-disable marketing-adjective -->
Never write seamless, robust, or world-class.
<!-- cws-enable -->
```

Four forms, each taking an optional list of rules. With no list, they cover
every rule.

| Directive | Covers |
|---|---|
| `<!-- cws-disable-file -->` | The whole file |
| `<!-- cws-disable -->` ... `<!-- cws-enable -->` | Everything between them |
| `<!-- cws-disable-next-line -->` | The line after it |
| `<!-- cws-disable-line -->` | The line it sits on |

A `cws-disable` with no matching `cws-enable` runs to the end of the file.

## Configure it

Drop a `clean-writing.config.json` next to your `package.json`. The command
searches upward from the working directory. A `cleanWriting` key in
`package.json` works too, as does `clean-writing.config.js` with a default
export.

```json
{
  "maxScore": 2,
  "maxSentenceWords": 20,
  "maxParagraphSentences": 6,
  "rules": {
    "intensifier": "off",
    "em-dash": "error"
  },
  "bannedWords": {
    "add": ["synergy", "ideate"],
    "remove": ["ensure"]
  },
  "passiveIgnore": {
    "add": ["converted"]
  },
  "ignore": ["node_modules", "CHANGELOG.md"]
}
```

Every word list takes `add` and `remove`, so you never restate a default list to
change one entry. The lists are `bannedWords`, `marketingAdjectives`,
`phrasalVerbs`, `filler`, `intensifiers`, and `passiveIgnore`.

Set `lintTables` to true to check table cells. Set `lintBlockquotes` to false to
skip quoted text.

## Use it from code

```js
import { lint } from 'clean-writing-lint';

const result = lint(markdownSource, { maxSentenceWords: 25 });
console.log(result.score, result.counts);
```

`lint` takes a decoded string and returns `words`, `sentences`, `score`,
`counts`, `violations`, `errorCount`, `warnCount`, and `longestSentence`. Each
violation carries `rule`, `severity`, `line`, `column`, `index`, `length`, and
`message`.

## Limits

The judgment rules of Simplified Technical English need a person. A checker
cannot tell you whether a noun is the right technical name, or whether a
sentence is true. This covers the mechanical subset, which is where the slop
lives.

Passive voice is the weakest rule. English past participles double as
adjectives, so "the file is deprecated" reads as passive to a regex. Common
cases ship in a skip list, and you can extend it with `passiveIgnore`.

Sentence splitting breaks on an abbreviation that ends in a period and comes
before a capital letter.

## Credit

A port of `ste-lint.py` by Ege Çelebi, MIT, from
https://github.com/woosal1337/blog/tree/main/videos/ep01-the-cure-for-ai-slop

Added here: line and column reporting, suppression comments, a config file,
per-rule severity, lists that skip the paragraph check, a contraction rule that
knows a possessive, an exit code for CI, and UTF-8 reads. That last one is a bug
fix. See `UPSTREAM_BUG.md` in the repository root.

MIT.
