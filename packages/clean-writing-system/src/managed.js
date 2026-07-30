// Managed blocks and version stamps.
//
// A file like AGENTS.md belongs to the user. We own one region inside it,
// fenced by markers, so a second run replaces that region instead of appending
// a duplicate.

export const START = '<!-- clean-writing-system:start -->';
export const END = '<!-- clean-writing-system:end -->';

const REGION = new RegExp(
  `${START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${END.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  )}`,
);

/** True when the file already carries our markers. */
export function hasBlock(source) {
  return REGION.test(source);
}

/** Wrap block text in the markers, with a note about who owns it. */
export function fence(body, { system, version }) {
  return [
    START,
    `<!-- Managed by clean-writing-system v${version} (${system}). ` +
      'Edits inside this block are replaced on the next run. -->',
    '',
    body.trim(),
    '',
    END,
  ].join('\n');
}

/**
 * Put the block into a document. Replaces an existing block, otherwise appends
 * one. Returns the new text.
 */
export function upsertBlock(source, block) {
  if (!source.trim()) return `${block}\n`;
  if (hasBlock(source)) return source.replace(REGION, block);
  return `${source.replace(/\s*$/, '')}\n\n${block}\n`;
}

const STAMP = /<!--\s*clean-writing-system:\s*(\S+)\s+v(\S+?)\s*-->/;

/**
 * Record which system and version was vendored.
 *
 * The stamp goes after any YAML frontmatter, because frontmatter has to start
 * on line 1 to be parsed.
 */
export function stamp(source, { system, version }) {
  const marker = `<!-- clean-writing-system: ${system} v${version} -->`;
  const stripped = source.replace(STAMP, '').replace(/^\n+/, '');

  const frontmatter = /^---\r?\n[\s\S]*?\r?\n---(\r?\n|$)/.exec(stripped);
  if (frontmatter) {
    const at = frontmatter[0].length;
    const body = stripped.slice(at).replace(/^\n+/, '');
    return `${stripped.slice(0, at)}\n${marker}\n\n${body}`;
  }
  return `${marker}\n\n${stripped}`;
}

/** Read a stamp back out. Returns null when the file has none. */
export function readStamp(source) {
  const found = STAMP.exec(source);
  return found ? { system: found[1], version: found[2] } : null;
}
