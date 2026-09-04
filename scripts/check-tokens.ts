import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { OUTPUT_DIR, renderOutputs } from './build-tokens';

/**
 * Fails when a committed token file no longer matches `tokens/tokens.json`.
 *
 * It renders and compares rather than regenerating. That distinction is the
 * whole point: vue's existing pipeline runs its generator inside `check:ci`, so
 * a hand-edited generated file is silently overwritten and CI stays green while
 * the committed copy is wrong. The server's OpenAPI drift check compares, and
 * this follows it.
 */

/**
 * Line endings are normalised first. A Windows checkout stores CRLF, and
 * comparing raw bytes would report every file as drifted for a reason that has
 * nothing to do with the tokens.
 */
const CR = String.fromCharCode(13);

function normalise(text: string): string {
  return text.split(CR).join('');
}

const failures: string[] = [];

for (const [file, expected] of renderOutputs()) {
  const path = join(OUTPUT_DIR, file);

  if (!existsSync(path)) {
    failures.push(`${file} is missing. Run: npm run tokens:build`);
    continue;
  }

  const actual = readFileSync(path, 'utf8');

  if (normalise(actual) === normalise(expected)) continue;

  const actualLines = normalise(actual).split('\n');
  const expectedLines = normalise(expected).split('\n');
  const at = actualLines.findIndex((line, index) => line !== expectedLines[index]);

  failures.push(
    [
      `${file} does not match tokens/tokens.json`,
      `  line ${String(at + 1)}`,
      `  committed: ${actualLines[at] ?? '(end of file)'}`,
      `  generated: ${expectedLines[at] ?? '(end of file)'}`,
    ].join('\n'),
  );
}

if (failures.length > 0) {
  console.error(failures.join('\n\n'));
  console.error('\nEdit tokens/tokens.json, not the generated files, then run: npm run tokens:build');
  process.exit(1);
}

console.log('[tokens] Committed files match tokens/tokens.json.');
