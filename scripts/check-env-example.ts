import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

/**
 * Fails when the app reads an environment variable that `.env.example` does not
 * mention.
 *
 * Nothing was checking this, and it had already gone wrong. Next reads two
 * variables that must move together — `BACKEND_URL` decides what the route
 * handlers do, `NEXT_PUBLIC_DATA_MODE` decides which transports the browser
 * builds, and `assertDataModeMatches` refuses a build where they disagree. The
 * example documented one of them. Anyone following it set `BACKEND_URL` alone
 * and hit a build failure explaining a variable they had never been told about;
 * `create-fredo-app` did exactly that on its first CI run.
 *
 * The example is the only place a reader looks for what an app can be
 * configured with. A variable missing from it is undiscoverable until something
 * throws.
 *
 * Only what the *app* reads: `src/` and the build config. A script's own
 * override is not something a person deploying this sets.
 */

const ROOT = resolve(process.cwd());

/**
 * Not environment variables anyone sets.
 *
 * The first group is the build tool's own inlined constants; NODE_ENV is set by
 * the tool that runs the build, not by a person editing a file.
 */
const BUILT_IN = new Set(['DEV', 'PROD', 'MODE', 'SSR', 'BASE_URL', 'NODE_ENV']);

const SOURCES = ['src', 'vite.config.ts'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.vue', '.js', '.mjs']);

function filesUnder(path: string): string[] {
  const full = join(ROOT, path);

  try {
    if (!statSync(full).isDirectory()) return [full];
  } catch {
    return [];
  }

  return readdirSync(full, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? filesUnder(join(path, entry.name)) : EXTENSIONS.has(extname(entry.name)) ? [join(full, entry.name)] : [],
  );
}

const READ = /(?:import\.meta|process)\.env\.([A-Z_][A-Z0-9_]*)/g;

const used = new Map<string, string>();

for (const source of SOURCES) {
  for (const file of filesUnder(source)) {
    const contents = readFileSync(file, 'utf8');

    for (const match of contents.matchAll(READ)) {
      const name = match[1];

      if (name && !BUILT_IN.has(name) && !used.has(name)) {
        used.set(name, file.slice(ROOT.length + 1).replace(/\\/g, '/'));
      }
    }
  }
}

/** Set or commented out — the frontends ship every variable commented, and a commented one still documents it. */
const documented = new Set(
  [...readFileSync(join(ROOT, '.env.example'), 'utf8').matchAll(/^#?\s*([A-Z_][A-Z0-9_]*)=/gm)].flatMap((match) =>
    match[1] ? [match[1]] : [],
  ),
);

const missing = [...used].filter(([name]) => !documented.has(name));

if (missing.length > 0) {
  console.error(`check:env — ${String(missing.length)} variable(s) read but not in .env.example:
`);

  for (const [name, file] of missing) console.error(`  ${name}  (read in ${file})`);

  console.error(`
Add them, with a line saying what the value does. A variable nobody documents is one nobody finds.`);
  process.exit(1);
}

console.log(`check:env — ${String(used.size)} variable(s) read, all documented in .env.example.`);
