// The tools this can wire up, and how to spot them.
//
// Detection only proposes. The user confirms, and `--tools` overrides.

import { existsSync } from 'node:fs';
import { join } from 'node:path';

const any = (dir, paths) => paths.find((p) => existsSync(join(dir, p)));

export const TARGETS = [
  {
    id: 'claude',
    label: 'Claude Code',
    // A skill loads only when the task is writing, so it costs nothing on
    // other turns. That is why it beats a line in CLAUDE.md.
    writes: '.claude/skills/clean-writing/SKILL.md',
    detect: (dir) => any(dir, ['.claude', 'CLAUDE.md']),
  },
  {
    id: 'cursor',
    label: 'Cursor',
    writes: '.cursor/rules/clean-writing.mdc',
    detect: (dir) => any(dir, ['.cursor', '.cursorrules']),
  },
  {
    id: 'agents',
    label: 'AGENTS.md (Codex, Copilot, Gemini CLI, Zed, Windsurf, Aider)',
    writes: 'AGENTS.md',
    detect: (dir) => any(dir, ['AGENTS.md']),
  },
];

export const TARGET_IDS = TARGETS.map((t) => t.id);

/**
 * Look for signs of each tool.
 *
 * @returns {Array<{ id: string, label: string, evidence: string }>}
 */
export function detect(dir) {
  const found = [];
  for (const target of TARGETS) {
    const evidence = target.detect(dir);
    if (evidence) found.push({ id: target.id, label: target.label, evidence });
  }
  return found;
}

/**
 * What to wire up when nothing is detected. AGENTS.md is the open standard, so
 * it reaches the most tools for one file.
 */
export const FALLBACK = ['agents'];
