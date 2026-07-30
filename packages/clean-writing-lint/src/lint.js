// The rules.
//
// Each rule reports violations with an absolute offset into the source, so the
// report can print a line and a column. Nothing here reads the filesystem.

import {
  maskNonProse,
  sentences,
  paragraphs,
  wordCount,
  maskCode,
  lineStarts,
  positionAt,
  lines,
} from './mask.js';
import { resolveConfig, patchList } from './config.js';
import {
  MARKETING,
  BANNED,
  PHRASAL,
  FILLER,
  INTENSIFIER,
  CONSTRUCTIONS,
  PASSIVE_IGNORE,
  PASSIVE_ADVERBS,
  IRREGULAR_PARTICIPLES,
  CONTRACTION_S_STEMS,
} from './wordlists.js';

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A match can span a line break. Collapse it so one violation stays on one
// line in the report.
const quote = (s) => s.trim().replace(/\s+/g, ' ');

/** Build one alternation regex for a phrase list. */
function phraseRegex(phrases) {
  if (phrases.length === 0) return null;
  const sorted = [...phrases].sort((a, b) => b.length - a.length);
  // A hyphen and a space are interchangeable, so "cutting-edge" also matches
  // "cutting edge".
  const body = sorted.map((p) => escape(p).replace(/[- ]/g, '[\\s-]+')).join('|');
  return new RegExp(`(?<![\\w-])(?:${body})(?![\\w-])`, 'gi');
}

// ---------------------------------------------------------------------------
// Disable directives
// ---------------------------------------------------------------------------

// Longest alternative first. `disable` would otherwise win against
// `disable-file`, because \b succeeds before the hyphen.
const DIRECTIVE =
  /<!--\s*cws-(disable-next-line|disable-file|disable-line|disable|enable)\b([^>]*?)-->/g;

/**
 * Read `cws-*` comments out of the raw source.
 *
 * Supported forms, each taking an optional space-separated rule list:
 *   <!-- cws-disable-file -->
 *   <!-- cws-disable --> ... <!-- cws-enable -->
 *   <!-- cws-disable-next-line long-sentence -->
 *   <!-- cws-disable-line em-dash -->
 */
export function readDirectives(raw, starts = lineStarts(raw)) {
  const file = new Set();
  const ranges = [];
  const byLine = new Map();
  let open = null;

  const addLine = (lineNumber, rules) => {
    if (!byLine.has(lineNumber)) byLine.set(lineNumber, new Set());
    const set = byLine.get(lineNumber);
    for (const rule of rules) set.add(rule);
  };

  DIRECTIVE.lastIndex = 0;
  let match;
  while ((match = DIRECTIVE.exec(raw)) !== null) {
    const [full, kind, argsText] = match;
    const rules = argsText.trim() ? argsText.trim().split(/[\s,]+/) : ['*'];
    const { line } = positionAt(starts, match.index);

    if (kind === 'disable-file') {
      for (const rule of rules) file.add(rule);
    } else if (kind === 'disable') {
      open = { start: match.index, rules: new Set(rules) };
    } else if (kind === 'enable') {
      if (open) {
        ranges.push({ ...open, end: match.index + full.length });
        open = null;
      }
    } else if (kind === 'disable-line') {
      addLine(line, rules);
    } else if (kind === 'disable-next-line') {
      addLine(line + 1, rules);
    }
  }

  // An unclosed disable runs to the end of the file.
  if (open) ranges.push({ ...open, end: raw.length });

  return { file, ranges, byLine };
}

function isSuppressed(directives, line, index, ruleId) {
  const matches = (set) => set.has('*') || set.has(ruleId);
  if (matches(directives.file)) return true;
  for (const range of directives.ranges) {
    if (index >= range.start && index < range.end && matches(range.rules)) {
      return true;
    }
  }
  const set = directives.byLine.get(line);
  return Boolean(set && matches(set));
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

function ruleLongSentence(ctx, report) {
  for (const sentence of ctx.sentenceList) {
    const count = wordCount(sentence.text);
    if (count > ctx.config.maxSentenceWords) {
      report(
        'long-sentence',
        sentence.start,
        sentence.text.length,
        `Sentence is ${count} words. The limit is ${ctx.config.maxSentenceWords}.`,
      );
    }
  }
}

function ruleLongParagraph(ctx, report) {
  const limit = ctx.config.maxParagraphSentences;
  for (const paragraph of ctx.paragraphList) {
    if (paragraph.sentences.length > limit) {
      report(
        'long-paragraph',
        paragraph.start,
        1,
        `Paragraph has ${paragraph.sentences.length} sentences. The limit is ${limit}.`,
      );
    }
  }
}

function scan(ctx, report, ruleId, pattern, describe) {
  if (!pattern) return;
  pattern.lastIndex = 0;
  let match;
  while ((match = pattern.exec(ctx.masked)) !== null) {
    report(ruleId, match.index, match[0].length, describe(match));
    if (match[0].length === 0) pattern.lastIndex += 1;
  }
}

function ruleCharacters(ctx, report) {
  scan(ctx, report, 'semicolon', /;/g, () => 'Semicolon. Write two sentences.');
  scan(ctx, report, 'em-dash', /[—–]/g, (m) =>
    `${m[0] === '—' ? 'Em dash' : 'En dash'}. Use a period, a comma, or parentheses.`,
  );
  scan(ctx, report, 'exclamation', /!/g, () => 'Exclamation mark.');
  scan(ctx, report, 'emoji', /\p{Extended_Pictographic}/gu, () =>
    'Emoji in prose.',
  );
}

function ruleContraction(ctx, report) {
  const stems = CONTRACTION_S_STEMS.map(escape).join('|');
  const pattern = new RegExp(
    String.raw`\b(?:[A-Za-z]+n['’]t|[A-Za-z]+['’](?:re|ve|ll|d|m)|(?:${stems})['’]s)\b`,
    'gi',
  );
  scan(ctx, report, 'contraction', pattern, (m) => `Contraction "${quote(m[0])}". Expand it.`);
}

function rulePassive(ctx, report) {
  const be = '(?:am|is|are|was|were|be|been|being)';
  const adverbs = PASSIVE_ADVERBS.join('|');
  const irregular = IRREGULAR_PARTICIPLES.join('|');
  const pattern = new RegExp(
    String.raw`\b(${be})((?:\s+(?:${adverbs}))*)\s+(\w+ed|${irregular})\b(\s+by\b)?`,
    'gi',
  );
  const ignore = new Set(ctx.passiveIgnore.map((w) => w.toLowerCase()));

  pattern.lastIndex = 0;
  let match;
  while ((match = pattern.exec(ctx.masked)) !== null) {
    const participle = match[3].toLowerCase();
    if (ignore.has(participle)) continue;
    const hasAgent = Boolean(match[4]);
    report(
      'passive-voice',
      match.index,
      match[0].length,
      hasAgent
        ? `Passive voice with a named actor: "${quote(match[0])}". Make it active.`
        : `Passive voice: "${quote(match[0])}". Name the actor, or keep it if the actor is unknown.`,
    );
  }
}

function ruleIngMainVerb(ctx, report) {
  const pattern = /\b(?:am|is|are|was|were|be|been)\s+(\w+ing)\b/gi;
  scan(ctx, report, 'ing-main-verb', pattern, (m) =>
    `"${quote(m[0])}". Use a simple tense.`,
  );
}

function ruleNominalization(ctx, report) {
  const patterns = [
    [
      /\b(?:perform(?:s|ed|ing)?|conduct(?:s|ed|ing)?|carr(?:y|ies|ied) out|undertak(?:e|es|ing))\s+(?:a|an|the)\s+\w+/gi,
      (m) => `"${quote(m[0])}". Use the verb directly.`,
    ],
    [
      /\b\w{4,}(?:tion|ment|ance|ence)\s+of\b/gi,
      (m) => `"${quote(m[0])}". Use the verb directly.`,
    ],
    [
      /\b(?:has|have|had)\s+the\s+ability\s+to\b|\b(?:is|are|was|were)\s+(?:able|unable)\s+to\b/gi,
      (m) => `"${quote(m[0])}". Write "can" or "cannot".`,
    ],
    [
      /\bmak(?:e|es|ing)\s+use\s+of\b/gi,
      () => 'Write "use".',
    ],
  ];
  for (const [pattern, describe] of patterns) {
    scan(ctx, report, 'nominalization', pattern, describe);
  }
}

function ruleWordLists(ctx, report) {
  scan(ctx, report, 'banned-word', phraseRegex(ctx.banned), (m) =>
    `"${quote(m[0])}" is on the banned list. Use the plain word.`,
  );
  scan(ctx, report, 'marketing-adjective', phraseRegex(ctx.marketing), (m) =>
    `"${quote(m[0])}" is a marketing claim. Delete it, or replace it with a measurement.`,
  );
  scan(ctx, report, 'phrasal-verb', phraseRegex(ctx.phrasal), (m) =>
    `"${quote(m[0])}" is a phrasal verb. Use a plain verb.`,
  );
  scan(ctx, report, 'filler', phraseRegex(ctx.filler), (m) =>
    `"${quote(m[0])}" carries no information. Delete the phrase.`,
  );
  scan(ctx, report, 'intensifier', phraseRegex(ctx.intensifiers), (m) =>
    `"${quote(m[0])}" weakens the sentence. Delete it.`,
  );
}

function ruleConstructions(ctx, report) {
  for (const construction of CONSTRUCTIONS) {
    const flags = construction.multiline ? 'gim' : 'gi';
    const pattern = new RegExp(construction.source, flags);
    scan(ctx, report, 'banned-construction', pattern, () => construction.message);
  }
}

const RULES = [
  ruleLongSentence,
  ruleLongParagraph,
  ruleCharacters,
  ruleContraction,
  rulePassive,
  ruleIngMainVerb,
  ruleNominalization,
  ruleWordLists,
  ruleConstructions,
];

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Lint one document.
 *
 * @param {string} raw source text, already decoded as UTF-8
 * @param {object} [userConfig]
 * @returns {{
 *   words: number,
 *   sentences: number,
 *   score: number,
 *   violations: Array<object>,
 *   counts: Record<string, number>,
 * }}
 */
export function lint(raw, userConfig = {}) {
  const config = userConfig.__resolved ? userConfig : resolveConfig(userConfig);
  const masked = maskNonProse(raw, config);
  const starts = lineStarts(raw);
  // Read directives from a copy with code blanked out, so an example directive
  // inside a fence stays an example.
  const directives = readDirectives(maskCode(raw), starts);

  const sentenceList = sentences(masked);
  const paragraphList = paragraphs(masked);
  const words = sentenceList.reduce((sum, s) => sum + wordCount(s.text), 0);

  const ctx = {
    raw,
    masked,
    config,
    sentenceList,
    paragraphList,
    banned: patchList(BANNED, config.bannedWords),
    marketing: patchList(MARKETING, config.marketingAdjectives),
    phrasal: patchList(PHRASAL, config.phrasalVerbs),
    filler: patchList(FILLER, config.filler),
    intensifiers: patchList(INTENSIFIER, config.intensifiers),
    passiveIgnore: patchList(PASSIVE_IGNORE, config.passiveIgnore),
  };

  const violations = [];
  const report = (ruleId, index, length, message) => {
    const severity = config.rules[ruleId] ?? config.defaultSeverity;
    if (severity === 'off') return;
    const { line, column } = positionAt(starts, index);
    if (isSuppressed(directives, line, index, ruleId)) return;
    violations.push({ rule: ruleId, severity, line, column, index, length, message });
  };

  for (const rule of RULES) rule(ctx, report);

  violations.sort((a, b) => a.index - b.index);

  const counts = {};
  for (const violation of violations) {
    counts[violation.rule] = (counts[violation.rule] ?? 0) + 1;
  }

  const safeWords = words || 1;
  return {
    words,
    sentences: sentenceList.length,
    score: Math.round((violations.length * 10000) / safeWords) / 100,
    violations,
    counts,
    errorCount: violations.filter((v) => v.severity === 'error').length,
    warnCount: violations.filter((v) => v.severity === 'warn').length,
    longestSentence: sentenceList.reduce(
      (max, s) => Math.max(max, wordCount(s.text)),
      0,
    ),
  };
}

export { lines };
