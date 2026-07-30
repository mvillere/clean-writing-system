// Output formats.

const ESC = String.fromCharCode(27);
const COLOR = {
  reset: ESC + '[0m',
  dim: ESC + '[2m',
  bold: ESC + '[1m',
  red: ESC + '[31m',
  yellow: ESC + '[33m',
  green: ESC + '[32m',
  cyan: ESC + '[36m',
};
function painter(enabled) {
  if (!enabled) return (_name, text) => text;
  return (name, text) => `${COLOR[name]}${text}${COLOR.reset}`;
}

/** Human-readable report. Returns a string. */
export function pretty(results, options = {}) {
  const { color = true, quiet = false, maxScore = null } = options;
  const paint = painter(color);
  const out = [];

  let totalWords = 0;
  let totalViolations = 0;

  for (const result of results) {
    totalWords += result.words;
    totalViolations += result.violations.length;

    if (result.violations.length === 0) {
      if (!quiet) {
        out.push(
          `${paint('bold', result.file)}  ${paint('green', 'clean')} ` +
            paint('dim', `(${result.words} words)`),
        );
      }
      continue;
    }

    out.push(paint('bold', result.file));
    const width = Math.max(
      ...result.violations.map((v) => `${v.line}:${v.column}`.length),
    );
    for (const violation of result.violations) {
      const where = `${violation.line}:${violation.column}`.padEnd(width);
      const level =
        violation.severity === 'error'
          ? paint('red', 'error')
          : paint('yellow', 'warn ');
      out.push(
        `  ${paint('dim', where)}  ${level}  ` +
          `${paint('cyan', violation.rule.padEnd(20))}  ${violation.message}`,
      );
    }
    const overLimit = maxScore !== null && result.score > maxScore;
    out.push(
      paint(
        'dim',
        `  ${result.violations.length} violations, ${result.words} words, ` +
          `score ${result.score.toFixed(2)} per 100 words` +
          (overLimit ? ` (over the limit of ${maxScore})` : ''),
      ),
    );
    out.push('');
  }

  const score = totalWords > 0 ? (totalViolations * 100) / totalWords : 0;
  const summary =
    `${results.length} files, ${totalWords} words, ` +
    `${totalViolations} violations, score ${score.toFixed(2)} per 100 words`;

  out.push(paint('bold', summary));
  return out.join('\n');
}

/** Machine-readable report. Returns a string. */
export function json(results) {
  const totalWords = results.reduce((sum, r) => sum + r.words, 0);
  const totalViolations = results.reduce((sum, r) => sum + r.violations.length, 0);
  return JSON.stringify(
    {
      files: results,
      summary: {
        files: results.length,
        words: totalWords,
        violations: totalViolations,
        score:
          totalWords > 0
            ? Math.round((totalViolations * 10000) / totalWords) / 100
            : 0,
      },
    },
    null,
    2,
  );
}

/** One line per file, in the shape of the original Python linter. */
export function compact(results) {
  return results
    .map((result) => {
      const name = result.file.padEnd(40);
      return (
        `${name} words=${String(result.words).padStart(5)} ` +
        `violations=${String(result.violations.length).padStart(4)} ` +
        `score=${result.score.toFixed(2).padStart(6)}`
      );
    })
    .join('\n');
}
