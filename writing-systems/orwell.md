---
name: orwell-writing
description: George Orwell's six rules for English prose, as a writing style guide for documentation, code comments, commit messages, and error messages. Use when asked to write or edit prose that must read plainly and not sound machine-written.
---

# Orwell's six rules

From "Politics and the English Language" (George Orwell, 1946). Apply these to
prose only. Do not apply them to code, identifiers, command syntax, or the text
inside code blocks.

<!-- cws-disable banned-word marketing-adjective filler intensifier
     passive-voice nominalization phrasal-verb banned-construction -->
<!-- Orwell's text and the glosses below quote the words they ban. -->

## The rules

1. Never use a metaphor, simile, or other figure of speech which you are used to
   seeing in print.
2. Never use a long word where a short one will do.
3. If it is possible to cut a word out, always cut it out.
4. Never use the passive where you can use the active.
5. Never use a foreign phrase, a scientific word, or a jargon word if you can
   think of an everyday English equivalent.
6. Break any of these rules sooner than say anything outright barbarous.

## What each rule means in a code repo

1. Cut the borrowed image. No "under the hood", "out of the box", "first-class
   citizen", "single source of truth", "battle-tested", "at scale". If you have
   read the phrase in another README, do not use it.
2. Use, not utilize. Start, not initiate. Help, not facilitate. Before, not
   prior to. Get, not obtain.
3. Delete the words that carry no information: "very", "simply", "basically",
   "in order to", "it is important to note that", "when it comes to". Then read
   the sentence again and delete more.
4. "The parser reads the file", not "the file is read by the parser". Passive
   is correct only when the actor is unknown or does not matter.
5. Keep the technical term when it is the accurate one. `mutex`, `idempotent`,
   and `webhook` mean something. Cut the jargon that only sounds technical:
   "solutioning", "operationalize", "surface area of the problem space".
6. Rule 6 outranks the other five. A sentence that follows every rule and reads
   badly is a failure. Fix the sentence.

<!-- cws-enable -->

## Before you return the text

- Read it once and cut every word that adds nothing.
- Find each passive sentence. Rewrite it as active when you know the actor.
- Find each phrase you have seen before in other documentation. Replace it with
  a plain statement or delete it.

## Note on this file

Orwell wrote these rules for political prose, not technical writing. They give
you good judgment and a short checklist. They do not give you a controlled
vocabulary. For stricter rules that a machine can check, see `chelebi.md` in
this directory.
