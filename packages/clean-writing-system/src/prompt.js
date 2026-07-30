// Minimal prompts over node:readline. No dependencies.
//
// Every prompt has a default, so pressing enter is always safe. When stdin is
// not a terminal the caller must pass flags instead, because a prompt that
// nobody can answer is a hang.

import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

export const isInteractive = () => Boolean(stdin.isTTY && stdout.isTTY);

async function ask(question) {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

/** Ask a yes or no question. */
export async function confirm(question, fallback = true) {
  const hint = fallback ? 'Y/n' : 'y/N';
  const answer = await ask(`${question} (${hint}) `);
  if (!answer) return fallback;
  return /^y/i.test(answer);
}

/** Ask for one of a list. Returns the chosen value. */
export async function select(question, choices, fallback) {
  const index = Math.max(0, choices.findIndex((c) => c.value === fallback));
  stdout.write(`${question}\n`);
  choices.forEach((choice, i) => {
    stdout.write(`  ${i + 1}) ${choice.label}\n`);
  });
  const answer = await ask(`Choose 1-${choices.length} [${index + 1}] `);
  if (!answer) return choices[index].value;
  const picked = Number(answer);
  if (!Number.isInteger(picked) || picked < 1 || picked > choices.length) {
    stdout.write('Not one of the choices. Using the default.\n');
    return choices[index].value;
  }
  return choices[picked - 1].value;
}

/** Ask for any number of a list. Returns the chosen values. */
export async function multiselect(question, choices, fallback = []) {
  const defaults = choices
    .map((c, i) => (fallback.includes(c.value) ? i + 1 : null))
    .filter((n) => n !== null);

  stdout.write(`${question}\n`);
  choices.forEach((choice, i) => {
    const mark = fallback.includes(choice.value) ? 'x' : ' ';
    stdout.write(`  ${i + 1}) [${mark}] ${choice.label}\n`);
  });
  const answer = await ask(
    `Choose by number, comma separated [${defaults.join(',') || 'none'}] `,
  );
  if (!answer) return fallback;
  if (/^none$/i.test(answer)) return [];

  const picked = answer
    .split(/[\s,]+/)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= choices.length)
    .map((n) => choices[n - 1].value);

  return picked.length > 0 ? [...new Set(picked)] : fallback;
}
