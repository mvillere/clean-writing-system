// Masking and text segmentation.
//
// Every mask replaces the matched region with spaces of the same length and
// keeps the newlines. Offsets in the masked text therefore match offsets in the
// source, so a violation index maps straight back to a line and a column.

/** Replace every character except a newline with a space. */
export function blank(text) {
  return text.replace(/[^\n]/g, ' ');
}

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---(?=\r?\n|$)/;
const FENCED = /^([ \t]*)(```|~~~)[^\n]*\n[\s\S]*?\n\1\2[^\n]*$/gm;
const UNCLOSED_FENCE = /^([ \t]*)(```|~~~)[\s\S]*$/m;
const INLINE_CODE = /`[^`\n]+`/g;
const HTML_COMMENT = /<!--[\s\S]*?-->/g;
const HTML_TAG = /<\/?[a-zA-Z][^>\n]*>/g;
const LINK_TARGET = /\]\([^)\n]*\)/g;
const LINK_DEF = /^\s*\[[^\]\n]+\]:\s*\S+.*$/gm;
const BARE_URL = /<?\bhttps?:\/\/\S+>?/g;
const TABLE_ROW = /^[ \t]*\|.*\|[ \t]*$/gm;
const BLOCKQUOTE = /^[ \t]*>[^\n]*$/gm;
const BADGE = /^\s*\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)\s*$/gm;

/**
 * Blank out code only, and nothing else.
 *
 * Directives are read from this, not from the raw source. A `cws-disable`
 * shown as an example inside a fenced block is documentation, not an
 * instruction, and it must not switch a rule off.
 *
 * @param {string} raw
 * @returns {string} text of the same length as `raw`
 */
export function maskCode(raw) {
  let text = raw.replace(FENCED, blank);
  text = text.replace(UNCLOSED_FENCE, blank);
  return text.replace(INLINE_CODE, blank);
}

/**
 * Blank out everything that is not prose.
 *
 * @param {string} raw
 * @param {{ lintTables?: boolean, lintBlockquotes?: boolean }} [options]
 * @returns {string} text of the same length as `raw`
 */
export function maskNonProse(raw, options = {}) {
  const { lintTables = false, lintBlockquotes = true } = options;
  let text = raw;

  const apply = (pattern) => {
    text = text.replace(pattern, blank);
  };

  text = text.replace(FRONTMATTER, blank);
  apply(FENCED);
  // A fence the writer never closed swallows the rest of the file. Markdown
  // renderers behave the same way, so the linter does too.
  text = text.replace(UNCLOSED_FENCE, blank);
  apply(HTML_COMMENT);
  apply(INLINE_CODE);
  apply(BADGE);
  apply(LINK_DEF);
  apply(LINK_TARGET);
  apply(BARE_URL);
  apply(HTML_TAG);
  if (!lintTables) apply(TABLE_ROW);
  if (!lintBlockquotes) apply(BLOCKQUOTE);

  return text;
}

const LIST_MARKER = /^(\s*)((?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?)/;
const HEADING_MARKER = /^(\s*)(#{1,6}\s+)/;
const QUOTE_MARKER = /^(\s*)((?:>\s?)+)/;

/** Blank a leading markdown marker while keeping the line length. */
function stripMarkers(line) {
  let out = line;
  for (const pattern of [QUOTE_MARKER, HEADING_MARKER, LIST_MARKER]) {
    out = out.replace(pattern, (_match, indent, marker) => indent + blank(marker));
  }
  return out;
}

/** Split into lines, keeping the absolute start offset of each. */
export function lines(text) {
  const result = [];
  let offset = 0;
  for (const line of text.split('\n')) {
    result.push({ text: line, start: offset });
    offset += line.length + 1;
  }
  return result;
}

// A sentence ends at . ! ? or : followed by whitespace and something that
// starts a new sentence. Abbreviations are the known weak spot; "e.g." and
// version numbers are handled by requiring whitespace after the mark.
const SENTENCE_BREAK = /(?<=[.!?:])\s+(?=["'“‘(\[]*[A-Z0-9])/g;

/**
 * Extract sentences with absolute offsets.
 *
 * @param {string} masked
 * @returns {Array<{ text: string, start: number }>}
 */
export function sentences(masked) {
  const result = [];

  for (const { text: rawLine, start } of lines(masked)) {
    const line = stripMarkers(rawLine);
    if (!line.trim()) continue;

    const chunks = [];
    let cursor = 0;
    SENTENCE_BREAK.lastIndex = 0;
    let match;
    while ((match = SENTENCE_BREAK.exec(line)) !== null) {
      chunks.push([cursor, match.index]);
      cursor = SENTENCE_BREAK.lastIndex;
    }
    chunks.push([cursor, line.length]);

    for (const [from, to] of chunks) {
      const slice = line.slice(from, to);
      const lead = slice.length - slice.trimStart().length;
      const body = slice.trim();
      if (!body) continue;
      result.push({ text: body, start: start + from + lead });
    }
  }

  return result;
}

/**
 * Split into blocks separated by a blank line, then keep only the prose lines
 * in each. A block that is all list items or all table rows yields no
 * sentences, so a long bulleted list never trips the paragraph rule.
 *
 * @param {string} masked
 * @returns {Array<{ sentences: Array<{ text: string, start: number }>, start: number }>}
 */
export function paragraphs(masked) {
  const blocks = [];
  let current = null;

  for (const { text, start } of lines(masked)) {
    if (!text.trim()) {
      current = null;
      continue;
    }
    const isMarkup =
      LIST_MARKER.test(text) ||
      HEADING_MARKER.test(text) ||
      QUOTE_MARKER.test(text) ||
      /^[ \t]*\|/.test(text) ||
      /^[ \t]*[-=]{3,}[ \t]*$/.test(text);

    if (isMarkup) {
      current = null;
      continue;
    }
    if (!current) {
      current = { text: '', start, pad: 0 };
      blocks.push(current);
    }
    // Keep offsets aligned by padding to the true start of the line.
    current.text += ' '.repeat(start - current.start - current.text.length) + text;
  }

  return blocks.map((block) => ({
    start: block.start,
    sentences: sentences(block.text).map((s) => ({
      text: s.text,
      start: s.start + block.start,
    })),
  }));
}

const WORD = /[A-Za-z0-9][A-Za-z0-9'’\-/]*/g;

/** Count words the way the scoring does. */
export function wordCount(text) {
  const found = text.match(WORD);
  return found ? found.length : 0;
}

/** Offsets of the start of every line. Build once, reuse for every lookup. */
export function lineStarts(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '\n') starts.push(i + 1);
  }
  return starts;
}

/** Map an offset to a 1-indexed line and column using a prebuilt index. */
export function positionAt(starts, index) {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (starts[mid] <= index) low = mid;
    else high = mid - 1;
  }
  return { line: low + 1, column: index - starts[low] + 1 };
}

/** Convenience wrapper for one-off lookups. */
export function position(text, index) {
  return positionAt(lineStarts(text), index);
}
