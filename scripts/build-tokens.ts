import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/**
 * Generates CSS custom properties from the single token source.
 *
 * The source is `tokens/tokens.json`, shared by all three boilerplates. The
 * values used to live in each repository's own CSS and three of them had
 * quietly drifted apart — see TOKEN_INVENTORY.md. Generating them removes the
 * way that happens, rather than correcting the values once.
 *
 * References (`{primitive.color.white}`) are resolved here rather than emitted
 * as `var()` chains. A chain makes devtools show a variable name instead of a
 * colour, and the indirection exists for the author's benefit, not the
 * browser's.
 */

type Token = { $value: string; $type?: string; $description?: string };

const SOURCE = resolve(process.cwd(), 'tokens/tokens.json');
const OUT_DIR = resolve(process.cwd(), 'src/styles/tokens');

/** Groups this repository emits, and the CSS variable prefix each one takes. */
const OUTPUTS = [
  { file: 'colors.css', group: 'web.color', prefix: '--color-' },
  { file: 'spacing.css', group: 'web.space', prefix: '--space-' },
  { file: 'radius.css', group: 'web.radius', prefix: '--radius-' },
  { file: 'shadow.css', group: 'web.shadow', prefix: '--shadow-' },
] as const;

const source: unknown = JSON.parse(readFileSync(SOURCE, 'utf8'));

/** Flattens the tree to `a.b.c` -> token, skipping `$` metadata keys. */
function flatten(node: unknown, path: string[] = [], out = new Map<string, Token>()): Map<string, Token> {
  if (typeof node !== 'object' || node === null) return out;

  const record = node as Record<string, unknown>;

  if ('$value' in record) {
    out.set(path.join('.'), record as unknown as Token);
    return out;
  }

  for (const [key, value] of Object.entries(record)) {
    if (key.startsWith('$')) continue;
    flatten(value, [...path, key], out);
  }

  return out;
}

const tokens = flatten(source);

/**
 * Follows `{path}` references. The hop limit turns a cycle into an error naming
 * the token rather than a hang.
 */
function resolveValue(path: string): string {
  const start = tokens.get(path);

  if (start === undefined) throw new Error(`Unknown token: ${path}`);

  let value: string = start.$value;

  for (let hops = 0; value.startsWith('{'); hops += 1) {
    if (hops > 10) throw new Error(`Reference cycle at ${path}`);

    const target = value.slice(1, -1);
    const next = tokens.get(target);

    if (next === undefined) throw new Error(`${path} references unknown token ${target}`);

    value = next.$value;
  }

  return value;
}

const NEWLINE = String.fromCharCode(10);

function header(group: string): string {
  return [
    '/*',
    ' * AUTO-GENERATED. Do not edit.',
    ` * Source: tokens/tokens.json (${group})`,
    ' * Regenerate: npm run tokens:build',
    ' */',
    '',
  ].join(NEWLINE);
}

/** Renders every output file's content without touching the disk. */
export function renderOutputs(): Map<string, string> {
  const rendered = new Map<string, string>();

  for (const output of OUTPUTS) {
    const members = [...tokens.keys()].filter((path) => path.startsWith(`${output.group}.`));

    if (members.length === 0) throw new Error(`No tokens under ${output.group}`);

    const declarations = members
      .map((path) => `  ${output.prefix}${path.slice(output.group.length + 1)}: ${resolveValue(path)};`)
      .join(NEWLINE);

    rendered.set(
      output.file,
      `${header(output.group)}:root {${NEWLINE}${declarations}${NEWLINE}}${NEWLINE}`,
    );
  }

  return rendered;
}

export const OUTPUT_DIR = OUT_DIR;

/**
 * Writing happens only when this file is run directly. The drift check imports
 * it, and must render without producing the very files it compares against.
 */
const isEntryPoint = process.argv[1]?.endsWith('build-tokens.ts') ?? false;

if (isEntryPoint) {
  mkdirSync(OUT_DIR, { recursive: true });

  for (const [file, content] of renderOutputs()) {
    const target = join(OUT_DIR, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content, 'utf8');
    console.log(`[tokens] ${file}`);
  }
}
