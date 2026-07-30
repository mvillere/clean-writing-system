import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { lint } from '../src/lint.js';
import { resolveConfig } from '../src/config.js';
import { lintFiles } from '../src/cli.js';
import { maskNonProse, sentences, paragraphs } from '../src/mask.js';

const rules = (text, config) => lint(text, config).violations.map((v) => v.rule);
const count = (text, rule, config) =>
  rules(text, config).filter((r) => r === rule).length;

// ---------------------------------------------------------------------------
// The upstream bug
// ---------------------------------------------------------------------------

test('an em dash in a UTF-8 file is counted', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cwlint-'));
  const path = join(dir, 'sample.md');
  writeFileSync(path, 'The parser reads the file — then it stops.\n', 'utf8');

  const [result] = lintFiles([path], resolveConfig());
  assert.equal(result.counts['em-dash'], 1);
});

test('an en dash is counted too', () => {
  assert.equal(count('A range of 1 – 2 items.', 'em-dash'), 1);
});

// ---------------------------------------------------------------------------
// Contractions, the false positive fixed from the Python version
// ---------------------------------------------------------------------------

test('a possessive is not a contraction', () => {
  assert.equal(count("The project's config and Orwell's rules.", 'contraction'), 0);
});

test('real contractions are caught', () => {
  const text = "Don't. It's fine. You're right. We'll see. I've read it. I'm here.";
  assert.equal(count(text, 'contraction'), 6);
});

test("let's is a contraction, not a possessive", () => {
  assert.equal(count("Let's go.", 'contraction'), 1);
});

// ---------------------------------------------------------------------------
// Masking
// ---------------------------------------------------------------------------

test('fenced code is not linted', () => {
  const text = ['Text here.', '', '```js', "const x = a ? b : c; // don't", '```', ''].join('\n');
  const found = rules(text);
  assert.deepEqual(found, []);
});

test('inline code is not linted', () => {
  assert.equal(count('Set `max_score = 1; // seamless` in the config.', 'semicolon'), 0);
});

test('masking preserves offsets so line numbers stay right', () => {
  const text = ['# Title', '', '```', 'ignored', '```', '', 'This is seamless.'].join('\n');
  const [violation] = lint(text).violations;
  assert.equal(violation.rule, 'marketing-adjective');
  assert.equal(violation.line, 7);
});

test('frontmatter is not linted', () => {
  const text = ['---', 'description: A seamless and powerful thing', '---', '', 'Plain text.'].join('\n');
  assert.deepEqual(rules(text), []);
});

test('link targets and bare URLs are not linted', () => {
  const text = 'Read [the notes](https://example.com/a-robust-guide) first.';
  assert.equal(count(text, 'marketing-adjective'), 0);
});

test('table rows are skipped by default and linted on request', () => {
  const text = ['| a | b |', '|---|---|', '| seamless | x |'].join('\n');
  assert.equal(count(text, 'marketing-adjective'), 0);
  assert.equal(count(text, 'marketing-adjective', { lintTables: true }), 1);
});

// ---------------------------------------------------------------------------
// Sentences and paragraphs
// ---------------------------------------------------------------------------

test('a long sentence is reported with its word count', () => {
  const text = 'One two three four five six seven eight nine ten and eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twentyone.';
  const [violation] = lint(text).violations;
  assert.equal(violation.rule, 'long-sentence');
  assert.match(violation.message, /22 words/);
});

test('the sentence limit is configurable', () => {
  const text = 'One two three four five six.';
  assert.equal(count(text, 'long-sentence', { maxSentenceWords: 3 }), 1);
  assert.equal(count(text, 'long-sentence', { maxSentenceWords: 10 }), 0);
});

test('a long bulleted list is not a long paragraph', () => {
  const text = ['- one.', '- two.', '- three.', '- four.', '- five.', '- six.', '- seven.'].join('\n');
  assert.equal(count(text, 'long-paragraph'), 0);
});

test('a genuinely long paragraph is reported', () => {
  const text = 'A one. B two. C three. D four. E five. F six. G seven.';
  assert.equal(count(text, 'long-paragraph'), 1);
});

test('sentences split across lines inside one paragraph', () => {
  const masked = maskNonProse('First one.\nSecond one.\n');
  assert.equal(sentences(masked).length, 2);
  assert.equal(paragraphs(masked)[0].sentences.length, 2);
});

// ---------------------------------------------------------------------------
// Passive voice
// ---------------------------------------------------------------------------

test('passive with a named actor is reported', () => {
  const found = lint('The file is read by the parser.').violations;
  assert.equal(found[0].rule, 'passive-voice');
  assert.match(found[0].message, /named actor/);
});

test('predicate adjectives are not passive', () => {
  assert.equal(count('The word is banned and the text is copyrighted.', 'passive-voice'), 0);
});

test('an adverb between the verb and the participle still counts', () => {
  assert.equal(count('The value is automatically converted.', 'passive-voice'), 1);
});

test('the passive ignore list is configurable', () => {
  const config = { passiveIgnore: { add: ['converted'] } };
  assert.equal(count('The value is converted.', 'passive-voice', config), 0);
});

// ---------------------------------------------------------------------------
// Word lists
// ---------------------------------------------------------------------------

test('banned words, marketing words, phrasal verbs, and filler are caught', () => {
  assert.equal(count('We utilize it.', 'banned-word'), 1);
  assert.equal(count('A seamless result.', 'marketing-adjective'), 1);
  assert.equal(count('We spin up a server.', 'phrasal-verb'), 1);
  assert.equal(count('It is important to note that it works.', 'filler'), 1);
  assert.equal(count('It is very fast.', 'intensifier'), 1);
});

test('a hyphen and a space are interchangeable in a phrase', () => {
  assert.equal(count('A cutting edge tool.', 'marketing-adjective'), 1);
  assert.equal(count('A cutting-edge tool.', 'marketing-adjective'), 1);
});

test('a word list is not matched inside a longer word', () => {
  assert.equal(count('The beginner guide.', 'banned-word'), 0);
});

test('word lists can be extended and trimmed', () => {
  assert.equal(count('Full synergy here.', 'banned-word', { bannedWords: { add: ['synergy'] } }), 1);
  assert.equal(count('We utilize it.', 'banned-word', { bannedWords: { remove: ['utilize'] } }), 0);
});

// ---------------------------------------------------------------------------
// Constructions
// ---------------------------------------------------------------------------

test('slop constructions are caught', () => {
  assert.equal(count('It is not just a cache. It is a philosophy.', 'banned-construction'), 1);
  assert.equal(count("In today's fast-paced world, speed matters.", 'banned-construction'), 1);
  assert.equal(count("Whether you are a beginner or an expert.", 'banned-construction'), 1);
  assert.equal(count('Let us dive in.', 'banned-construction'), 1);
  assert.equal(count('## Why does this matter?', 'banned-construction'), 1);
});

// ---------------------------------------------------------------------------
// Suppression
// ---------------------------------------------------------------------------

test('disable-file turns everything off', () => {
  const text = '<!-- cws-disable-file -->\n\nA seamless and robust thing.';
  assert.deepEqual(rules(text), []);
});

test('disable-file can target one rule', () => {
  const text = '<!-- cws-disable-file marketing-adjective -->\n\nA seamless thing; and more.';
  assert.deepEqual(rules(text), ['semicolon']);
});

test('a disable region ends at the enable comment', () => {
  const text = [
    '<!-- cws-disable -->',
    'A seamless thing.',
    '<!-- cws-enable -->',
    'Another seamless thing.',
  ].join('\n');
  assert.equal(count(text, 'marketing-adjective'), 1);
});

test('an unclosed disable region runs to the end of the file', () => {
  const text = '<!-- cws-disable -->\nA seamless thing.\nAnother robust thing.';
  assert.deepEqual(rules(text), []);
});

test('disable-next-line covers only the next line', () => {
  const text = [
    '<!-- cws-disable-next-line marketing-adjective -->',
    'A seamless thing.',
    'Another seamless thing.',
  ].join('\n');
  assert.equal(count(text, 'marketing-adjective'), 1);
});

// ---------------------------------------------------------------------------
// Severity, scoring, and config
// ---------------------------------------------------------------------------

test('a rule can be switched off', () => {
  assert.equal(count('A seamless thing.', 'marketing-adjective', {
    rules: { 'marketing-adjective': 'off' },
  }), 0);
});

test('a rule can be raised to error', () => {
  const result = lint('A seamless thing.', { rules: { 'marketing-adjective': 'error' } });
  assert.equal(result.errorCount, 1);
  assert.equal(result.warnCount, 0);
});

test('score is violations per 100 words', () => {
  const result = lint('A seamless thing.');
  assert.equal(result.words, 3);
  assert.equal(result.violations.length, 1);
  assert.equal(result.score, 33.33);
});

test('an empty document scores zero and does not divide by zero', () => {
  const result = lint('');
  assert.equal(result.score, 0);
  assert.equal(result.words, 0);
});

test('an unknown rule in config is rejected', () => {
  assert.throws(() => resolveConfig({ rules: { 'no-such-rule': 'off' } }), /Unknown rule/);
});

// ---------------------------------------------------------------------------
// The style guide problem
// ---------------------------------------------------------------------------

test('a directive inside a code fence is an example, not an instruction', () => {
  const text = [
    'Write it like this:',
    '',
    '```markdown',
    '<!-- cws-disable-file -->',
    '```',
    '',
    'A seamless thing.',
  ].join('\n');
  assert.deepEqual(rules(text), ['marketing-adjective']);
});

test('a directive inside inline code is an example too', () => {
  const text = 'Use `<!-- cws-disable -->` to switch it off. A seamless thing.';
  assert.equal(count(text, 'marketing-adjective'), 1);
});

test('a style guide can quote the words it bans inside a disable region', () => {
  const text = [
    'Do not use these words.',
    '',
    '<!-- cws-disable banned-word marketing-adjective -->',
    'utilize, leverage, seamless, robust',
    '<!-- cws-enable -->',
    '',
    'Use the plain word instead.',
  ].join('\n');
  assert.deepEqual(rules(text), []);
});
