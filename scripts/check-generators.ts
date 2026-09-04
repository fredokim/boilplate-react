import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Runs each generator and checks what it produced against FEATURE_CONTRACT.md.
 *
 * The previous check asserted that four generator *files existed*. It never ran
 * one, and the feature generator was not among the four — so a generator could
 * emit a feature the router cannot see and nothing would notice. This runs them.
 *
 * Generated output lands in the real source tree because the generators resolve
 * paths from `process.cwd()` and the router's glob only sees files under
 * `src/features`. Every run is removed afterwards, including on failure.
 */

const ROOT = resolve(process.cwd());

/** A name no human would pick, so a leftover directory is obviously ours. */
const FEATURE = 'generator-contract-probe';
const PASCAL = 'GeneratorContractProbe';
const CAMEL = 'generatorContractProbe';

const featureDir = join(ROOT, 'src', 'features', FEATURE);

/** Made for every feature, per FEATURE_CONTRACT.md. */
const ALWAYS = [
  `views/${PASCAL}View.tsx`,
  `views/${PASCAL}View.stories.tsx`,
  `views/${PASCAL}View.test.tsx`,
  `containers/${PASCAL}Container.tsx`,
  `routes/${CAMEL}.route.tsx`,
];

/** Made only with `--api`. The three move together; none appears alone. */
const WITH_API = [`api/${CAMEL}.api.ts`, `dto/${PASCAL}.dto.ts`, `hooks/use${PASCAL}Query.ts`];

const failures: string[] = [];

function cleanup(): void {
  rmSync(featureDir, { recursive: true, force: true });
}

cleanup();

function generate(flags: string[]): void {
  try {
    execFileSync('npx', ['tsx', 'scripts/generate-feature.ts', FEATURE, ...flags], {
      cwd: ROOT,
      stdio: 'pipe',
      shell: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`generate-feature.ts ${flags.join(' ')} failed to run: ${message}`);
  }
}

function expect(relatives: string[], present: boolean, label: string): void {
  for (const relative of relatives) {
    const exists = existsSync(join(featureDir, relative));

    if (exists === present) continue;

    failures.push(
      present
        ? `${label}: did not create ${FEATURE}/${relative}`
        : `${label}: created ${FEATURE}/${relative}, which belongs to --api only`,
    );
  }
}

// Default: no api module, so scaffolding cannot fail the contract test.
generate([]);
expect(ALWAYS, true, 'generate-feature.ts');
expect(WITH_API, false, 'generate-feature.ts');

/**
 * Running it again over an existing feature must refuse rather than overwrite.
 * Silent overwriting is how uncommitted work disappears.
 */
let refused = false;

try {
  execFileSync('npx', ['tsx', 'scripts/generate-feature.ts', FEATURE], {
    cwd: ROOT,
    stdio: 'pipe',
    shell: true,
  });
} catch {
  refused = true;
}

if (!refused) failures.push('generate-feature.ts overwrote an existing feature instead of refusing');

/** A name with a path separator must not be able to write outside features/. */
let rejectedPath = false;

try {
  execFileSync('npx', ['tsx', 'scripts/generate-feature.ts', '../escaped'], {
    cwd: ROOT,
    stdio: 'pipe',
    shell: true,
  });
} catch {
  rejectedPath = true;
}

if (!rejectedPath) failures.push('generate-feature.ts accepted a name containing a path separator');

cleanup();

generate(['--api']);
expect(ALWAYS, true, 'generate-feature.ts --api');
expect(WITH_API, true, 'generate-feature.ts --api');

/**
 * An empty directory is its own defect: it advertises a convention the
 * generator did not actually follow.
 */
if (existsSync(featureDir)) {
  for (const entry of readdirSync(featureDir)) {
    const path = join(featureDir, entry);

    if (statSync(path).isDirectory() && readdirSync(path).length === 0) {
      failures.push(`generate-feature.ts left ${FEATURE}/${entry}/ empty`);
    }
  }
}

/**
 * The generators that only ever wrote to a temp path keep their existence
 * check. Running them is a separate piece of work; what matters first is that
 * the one producing whole features is covered at all.
 */
for (const generator of [
  'scripts/generate-contract.ts',
  'scripts/generate-layout.ts',
  'scripts/generate-page.ts',
  'scripts/generate-form.ts',
]) {
  if (!existsSync(join(ROOT, generator))) failures.push(`Missing automation generator: ${generator}`);
}

cleanup();

/**
 * `generate.ts` must delegate rather than keep its own copy. It used to hold
 * an inlined version that produced a different, incomplete result, so which
 * command you typed decided whether the contract was followed.
 */
const entryPoint = readFileSync(join(ROOT, 'scripts/generate.ts'), 'utf-8');

if (!entryPoint.includes('scripts/generate-feature.ts')) {
  failures.push('scripts/generate.ts does not delegate feature generation to generate-feature.ts');
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  console.error('\nSee FEATURE_CONTRACT.md for what a generated feature must contain.');
  process.exit(1);
}

console.log('[generators] Generated features match FEATURE_CONTRACT.md.');
