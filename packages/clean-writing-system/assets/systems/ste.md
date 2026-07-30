---
name: ste-writing
description: Write and edit prose in Simplified Technical English. Covers READMEs, documentation, code comments, error messages, commit messages, pull request text, and release notes. Use when asked to make writing clear and plain, to remove AI slop, to enforce a house writing style, or to write docs that read as human work. Never applies to code itself.
---

# Simplified Technical English for code repositories

This file is a writing style guide for an AI agent. It is self-contained. Copy
it into a repository and point your agent instruction file at it. You do not
need to install anything else.

Adapted from the `ste-writing` skill by Ege Çelebi (MIT), which distills
ASD-STE100 Simplified Technical English.

## Scope

Apply this file to prose:

- README files and all documentation
- code comments and docstrings
- error messages, warnings, and log lines
- commit messages, pull request titles and bodies
- changelog entries and release notes
- API reference text

Do not apply it to:

- code, identifiers, type names, or command syntax
- the contents of code blocks
- quoted output from a tool
- direct quotations from another source
- **anything the reader must match against a screen.** Button names, menu items,
  tab and field labels, status values, error codes, file names, and command
  flags. Copy each one exactly as the product spells it.
- **defined terms and section labels.** If a document set uses the same heading
  in every file, keep that heading. If a glossary defines a term, use that term.
- marketing copy, blog posts, essays, or anything that needs a voice. This
  system removes voice on purpose.

A rule that improves a sentence but renames a button has made the document
wrong. A reader who cannot find **Deactivate** on the screen is stuck, however
plain the surrounding prose reads.

## Two modes

**Strict.** Use for error messages, warnings, log lines, runbooks, procedures,
and any step a person follows under pressure. Apply every rule and both length
limits.

**Flavored.** Use for README files, documentation, pull request text, and
changelogs. Apply the sentence limits, the active voice rule, and the delete
lists. Relax the core vocabulary so the text keeps enough range to read well.

If nobody tells you which mode to use, use flavored for documents and strict for
anything a machine prints.

## Rules

<!-- cws-disable -->
<!-- Everything from here to the self-check quotes the words and the -->
<!-- constructions it bans. A linter cannot tell a rule from a breach. -->

### Words

- Use one name for one thing. Do not call the same item a "job" in one paragraph
  and a "task" in the next. Pick one name and keep it.
- Give each word one meaning. "Fall" means to move down. It does not mean to
  decrease. "Follow" means to come after. It does not mean to obey.
- Use the shortest common word that says the thing. See the substitution table.
- Use American spelling.
- Write numbers as numerals: 3, not three. Write "3 seconds", not "a few
  seconds".

### Verbs

- Use active voice. Write "the parser reads the file". Do not write "the file is
  read by the parser". Use passive only when the actor is unknown.
- Use a verb for an action. Write "analyze the log". Do not write "perform an
  analysis of the log".
- Do not stack helper verbs. Do not write "it is important to note that this may
  help to improve performance". Write "this makes the query faster".
- Do not use an "-ing" form as the main verb when a simple tense works. Write
  "the server sends a receipt". Do not write "the server is sending a receipt".
- Put a condition before its command. Write "if the file is missing, create it".
  Do not write "create the file if it is missing".

### Sentences

- One instruction per sentence.
- Maximum 20 words for an instruction. Maximum 25 words for a description.
- Do not use contractions. Write "do not", not "don't".
- A possessive is not a contraction. Keep the apostrophe. Write "the user's
  account" and "the map's badge". Do not write "the user account" when you mean
  the account that belongs to the user.
- Keep the articles. Write "open the file", not "open file".

### Punctuation

- Do not use semicolons. Write two sentences.
- Do not use em dashes or en dashes in prose. Use a period, a comma, or
  parentheses.
- Do not use exclamation marks.
- Do not use emoji in documentation, comments, or error messages.

### Structure

- One topic per paragraph. Maximum 6 sentences per paragraph.
- For a procedure, use a numbered list. One action per item. Use the imperative.
- Number a list only when the reader does the items in order. Keep facts,
  warnings, and options as bullets. A reader under pressure reads item 3 of a
  numbered list as the third thing to do, so a warning put there gets performed.
- Do not renumber a bulleted list to satisfy a rule. Ask what the list is first.
- For a set of parallel facts, use a table or a bulleted list.
- Do not write a summary paragraph that repeats what the reader just read.
- Do not write a preamble that says what you are about to say.

Write only the text the user asked for. Do not add an introduction, a summary,
or a closing remark.

## Core vocabulary

ASD-STE100 controls writing with an approved dictionary of about 900 words. That
dictionary is copyrighted, so this file does not reproduce it. The real
dictionary is also built for aircraft maintenance. It has no entry for "async",
"webhook", or "idempotent".

This section replaces it with the same mechanism in a form that fits software.
Three parts: the safe core, your project's technical names, and the
substitutions.

### How the word list works

1. **The safe core.** The words below are always allowed. Reach for these first.
2. **Technical names.** Any noun that names a real thing in your domain is
   allowed: `webhook`, `mutex`, `migration`, `bearer token`, `service worker`.
   Write it the same way every time. Keep the list in a glossary file in the
   repository.
3. **Technical verbs.** Any verb that names a real action in your domain is
   allowed: deploy, cache, hash, parse, render, serialize, throttle, migrate.
   Same rule. One form, every time.
4. **Everything else.** If a word is not in the safe core and is not a technical
   name or verb, replace it with the shortest common word that means the same
   thing.

A word earns a place only if removing it loses information.

### The safe core

Verbs: add, allow, apply, ask, build, call, cancel, change, check, choose,
clear, close, connect, continue, copy, count, create, delete, do, download,
edit, enter, exit, fail, find, fix, get, give, go, hold, install, keep, know,
let, list, load, lock, log, look, make, mark, match, move, name, need, open,
pass, print, put, read, remove, rename, repeat, replace, report, reset, restart,
return, run, save, see, send, set, show, sign, skip, sort, start, stop, store,
take, tell, test, try, turn, update, upload, use, wait, want, work, write.

Nouns: account, answer, application, change, code, command, data, date, default,
error, example, field, file, folder, format, function, group, help, image,
input, item, key, level, limit, line, link, list, log, message, method, name,
network, number, option, order, output, page, part, password, path, port,
problem, process, program, project, record, request, response, result, rule,
screen, server, service, size, source, state, step, string, system, table, task,
test, text, time, type, unit, user, value, version, view, window, word.

Connectors: after, also, and, as, because, before, but, for, if, or, so, then,
when, while, with, without, until, unless.

Modifiers: all, any, both, each, every, few, first, last, less, many, more,
most, new, next, no, old, one, only, other, same, some, this, these.

### Substitutions

Do not use the words on the left. Use the word on the right.

These apply to your own prose only. Never substitute inside a name the reader
has to match: a button, a tab, a field, a status, an error code, a glossary
term, or a section heading that other documents share. "Verify" stays "Verify"
when it is the name of a step. Consistency across a document set outranks the
better word.

Verbs:

```
begin, commence, initiate        -> start
utilize, leverage                -> use
facilitate, assist               -> help
ensure, guarantee                -> make sure
obtain, acquire                  -> get
demonstrate, showcase            -> show
terminate                        -> stop, end
attempt                          -> try
require                          -> need
permit                           -> let, allow
modify                           -> change
generate, produce                -> make, create
determine                        -> find, decide
validate, verify                 -> check
transmit                         -> send
receive                          -> get
provide                          -> give
maintain                         -> keep
locate                           -> find
select                           -> choose, pick
construct                        -> build
consume                          -> use
encounter                        -> hit
indicate                         -> show, mean
mitigate                         -> reduce
consolidate                      -> combine
instantiate                      -> create
orchestrate                      -> run, coordinate
architect (as a verb)            -> design
surface (as a verb)              -> show, report
```

Phrases:

```
prior to                         -> before
subsequent to, following         -> after
regarding, concerning            -> about
with respect to, in terms of     -> about, for
in order to, for the purpose of  -> to
due to the fact that             -> because
in the event that                -> if
at this point in time            -> now
in the near future               -> soon
by means of                      -> by, with
additionally, furthermore        -> also
moreover                         -> also
therefore, consequently, thus    -> so
nevertheless, notwithstanding    -> but, still
whilst                           -> while
amongst                          -> among
when it comes to X               -> for X
```

Nominalizations:

```
perform an analysis of           -> analyze
make a decision about            -> decide
give consideration to            -> consider
carry out a review of            -> review
provide support for              -> support
has the ability to, is able to   -> can
make use of                      -> use
functionality                    -> the feature, or name what it does
utilization                      -> use
methodology                      -> method
capability                       -> what it can do
```

Quantities:

```
numerous, myriad, a plethora of  -> many, or give the number
a multitude of                   -> many, or give the number
a variety of, a range of         -> several, or list them
the vast majority of             -> most
approximately                    -> about
```

Phrasal and vogue verbs:

```
spin up                          -> start
spin down, tear down             -> stop, remove
reach out                        -> ask, contact, email
kick off                         -> start
roll out                         -> release, ship
ramp up                          -> increase
drill down                       -> look at in detail
dive into                        -> read, look at
circle back                      -> follow up, or name the date
wire up, hook up                 -> connect
level up                         -> improve
unpack                           -> explain
```

### Delete on sight: hype

Delete these words. If the claim behind one is real, replace it with a
measurement or a fact.

seamless, seamlessly, robust, powerful, blazing fast, lightning-fast,
cutting-edge, state-of-the-art, next-generation, revolutionary, game-changing,
world-class, best-in-class, industry-leading, enterprise-grade, battle-tested,
turnkey, elegant, delightful, effortless, intuitive, comprehensive, rich,
first-class, unparalleled, sensible defaults, minimal friction, supercharge,
unlock, unleash, empower, transform, elevate, streamline, revolutionize,
harness.

"Fast" is not a claim. "Returns in under 40 ms at p99" is a claim.

### Delete on sight: filler

Delete the whole phrase. The sentence is always better without it.

it is important to note that, it should be noted that, it is worth noting that,
please note that, as mentioned above, as noted above, needless to say, of
course, at the end of the day, that being said, in essence, essentially,
basically, fundamentally, actually, really, very, quite, rather, simply, just
(as a softener), in conclusion, in summary (on any text under 500 words).

### Banned constructions

These are the shapes that mark machine writing. Do not use them at all.

- The negation flip: "It is not just a cache. It is a way of thinking about
  cost."
- The setup question: "So what does this actually do? Let us look."
- The scene opener: "In today's fast-paced development environment..."
- The audience sweep: "Whether you are a beginner or an expert..."
- The invitation: "Let us dive in." "Here is the thing."
- The rule of three used as decoration: "fast, simple, and reliable."
- The closing restatement that adds no fact.
- A bold phrase in every paragraph for emphasis.
- A heading that is a question, when a noun phrase would do.

## Rules per artifact

### README and documentation

State what the thing is in the first sentence. State the problem it solves in
the second. Do not open with history, context, or a greeting.

Show a working example before you explain the options. Give the shortest command
that produces a visible result.

Write the limits down. A document that lists what the tool cannot do is more
useful than one that does not.

### Code comments

Write the comment only when the code cannot say it. Do not restate the code.

```
// BAD: increment the counter
// GOOD: the vendor API counts a retry as a new call, so we count it too
```

Explain why. Record the constraint, the tradeoff, the bug number, or the reason
the obvious approach fails. A comment that explains what a reader can see costs
maintenance and gives nothing.

Keep the comment next to the code it describes. Delete the comment when you
delete the code.

For a docstring, write one sentence that says what the function returns, then
the parameters, then the errors it raises. Do not write "This function is
responsible for". Write "Returns".

### Error messages

Use strict mode. An error message has three parts, in this order:

1. What happened.
2. Why it happened.
3. What the reader does next.

```
BAD:  An error occurred while processing your request. Please try again later.
GOOD: The upload failed. The file is 82 MB and the limit is 25 MB.
      Split the file or raise the limit in settings.
```

Rules:

- Name the actual value and the actual limit. Never write "invalid input".
- Do not apologize. Do not use "please" more than once.
- Do not blame the reader. Write "the token expired", not "you used an expired
  token".
- Do not print a stack trace as the message. Print the message, then the trace.
- Never end with "Please try again later" unless waiting is the real fix.

### Commit messages and pull requests

The subject line is imperative and under 60 characters: "Add retry to the
webhook sender". Not "Added" and not "Adding".

The body answers two questions. What was wrong before. What changed. Do not list
the files. The diff lists the files.

For a pull request, put the risk and the rollback step in the body. A reviewer
needs those more than a summary of the diff.

### Changelog and release notes

One line per change. Start with a verb: Added, Fixed, Changed, Removed.

Write what the reader can now do, not what you refactored. Mark every breaking
change on its own line with the word "Breaking".

<!-- cws-enable -->

## Self-check before returning text

Run this list every time. Fix what fails, then return the text.

1. Is any sentence longer than 20 words? Split it.
2. Is there a semicolon, an em dash, or an exclamation mark? Replace it.
3. Is there a contraction? Expand it.
4. Is any sentence passive with a known actor? Make it active.
5. Is there an "-ing" main verb, a nominalization, or a phrasal verb? Use a
   plain verb.
6. Is any word on the hype list or the filler list? Delete it.
7. Is one thing called by two names? Pick one name.
8. Is there a preamble or a closing summary? Delete it.
9. Read the first sentence alone. Does it carry a fact? If not, rewrite it.

## What this file cannot do

This file fixes the form of bad writing. It does not fix the substance. A
paragraph can pass every rule above and still be empty or wrong. Check the facts
yourself.

Rule 6 of Orwell applies here too. If a sentence follows every rule and still
reads badly, break the rule and write the better sentence.

## Credit and license

Adapted from `ste-writing-skill.md`, copyright (c) 2026 Ege Çelebi, MIT.
This file is MIT. Keep these two lines when you copy it.

ASD-STE100 is a controlled language written for aircraft maintenance
documentation. It is free to read and it is copyrighted. This file does not
reproduce it. See https://asd-ste100.org.
