/**
 * One command that says whether this repository is ready to ship.
 *
 * Everything here already existed as an npm script. This adds no new checking —
 * it adds an order, a name for each gate, and a report. The gates are the same
 * ones CI runs, from this list, so the two cannot drift into disagreeing about
 * what "green" means.
 *
 * **Why not `a && b && c`.** `check:ci` was a chain of thirteen scripts joined
 * with `&&`, and it has one failure mode that matters: it stops at the first
 * problem and buries which one it was in several hundred lines of output. That
 * is not hypothetical — a documentation move broke `check:deps`, the chain
 * printed a table of package sizes and an accusation about `hls.js`, and reading
 * the tail of the output gave no hint that the ninth of thirteen steps was the
 * one that failed.
 *
 * So this runs every gate, captures each one's output separately, and ends with
 * a table. One run tells you everything that is wrong, not the first thing.
 *
 * **Skipping is a result, not a pass.** A gate whose tool is not installed
 * reports `skipped` with the reason and is listed in the summary. Reporting
 * "ready" from a run where four gates never executed is the failure this whole
 * refactor has been about.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

type Gate = {
  /** Short, stable, and what the summary prints. */
  name: string;
  /** What it proves. Printed when it fails, so the failure explains itself. */
  proves: string;
  command: string;
  args: string[];
  /** Heavy gates are skipped by `--quick`, which is the fast local loop. */
  heavy?: boolean;
  /** Returns a reason to skip, or null to run. */
  unavailable?: () => string | null;
};

const npm = (script: string): Pick<Gate, 'command' | 'args'> => ({
  command: 'npm',
  args: ['run', script],
});

function toolMissing(tool: string, args: string[] = ['--version']): string | null {
  const probe = spawnSync(tool, args, { stdio: 'ignore', shell: process.platform === 'win32' });

  return probe.status === 0 ? null : `${tool} is not available on this machine`;
}

/**
 * The order is deliberate: cheap and structural first, so a stale document or a
 * missing environment variable is reported in seconds rather than after a
 * Storybook build.
 */
/**
 * Installing from a clean state is not a gate here. `npm ci` is the step CI
 * runs before this, and doing it locally would delete a working node_modules
 * to prove something the lockfile already decides.
 */
const GATES: readonly Gate[] = [
  {
    name: 'generated-drift',
    proves: 'design tokens on disk match what the generator produces',
    ...npm('check:tokens'),
  },
  {
    name: 'doc-links',
    proves: 'every document resolves its links and is reachable from the README',
    ...npm('check:docs'),
  },
  {
    name: 'env-contract',
    proves: 'every variable the app reads is documented in .env.example',
    ...npm('check:env'),
  },
  { name: 'lint', proves: 'the code passes the lint rules with no warnings', ...npm('lint') },
  { name: 'typecheck', proves: 'the types are sound', ...npm('typecheck') },
  { name: 'unit', proves: 'the unit and component tests pass and coverage stays above its thresholds', ...npm('test:coverage') },
  {
    name: 'contract',
    proves: "the DTOs agree with the server's published OpenAPI document",
    ...npm('check:contract'),
  },
  {
    name: 'automation',
    proves: 'Storybook coverage, validation coverage and the mock registry are present',
    ...npm('check:automation'),
  },
  { name: 'generators', proves: 'each generator produces what FEATURE_CONTRACT.md requires', ...npm('check:generators') },
  { name: 'dependency-size', proves: 'no runtime dependency exceeds its cap without a written reason', ...npm('check:deps') },
  { name: 'build', proves: 'the production bundle builds', ...npm('build') },
  { name: 'bundle-budget', proves: 'no chunk exceeds its size cap', ...npm('check:bundle') },
  {
    name: 'storybook',
    proves: 'the component catalogue builds',
    heavy: true,
    ...npm('build-storybook'),
  },
  {
    name: 'e2e',
    proves: 'the core browser scenarios pass',
    heavy: true,
    unavailable: () => (existsSync(resolve(ROOT, 'node_modules', '@playwright', 'test')) ? null : 'Playwright is not installed'),
    ...npm('e2e'),
  },
  {
    name: 'audit',
    proves: 'no dependency carries a known moderate-or-worse advisory',
    command: 'npm',
    args: ['audit', '--audit-level=moderate'],
  },
  {
    name: 'image',
    proves: 'the production image builds — this is what Render deploys',
    heavy: true,
    unavailable: () =>
      // In CI the `deploy-image` job builds this image *and* runs it, which is
      // strictly more than a build. Doing both would build it twice on two runners.
      process.env.GITHUB_ACTIONS === 'true' ? 'covered by the deploy-image job' : toolMissing('docker'),
    command: 'docker',
    args: ['build', '-t', 'boilplate-react:release-check', '.'],
  },
];

type Outcome = { gate: Gate; status: 'passed' | 'failed' | 'skipped'; ms: number; detail: string };

const quick = process.argv.includes('--quick');
const inActions = process.env.GITHUB_ACTIONS === 'true';

function run(gate: Gate): Outcome {
  const reason = gate.unavailable?.() ?? null;

  if (reason) return { gate, status: 'skipped', ms: 0, detail: reason };
  if (quick && gate.heavy) return { gate, status: 'skipped', ms: 0, detail: 'heavy gate, skipped by --quick' };

  const started = Date.now();

  if (inActions) console.log(`::group::${gate.name}`);

  const result = spawnSync(gate.command, gate.args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    // Captured rather than inherited, so a failing gate's output can be shown
    // next to its name instead of somewhere in a wall of scrollback.
    stdio: 'pipe',
  });

  const ms = Date.now() - started;
  // `encoding: 'utf8'` makes both strings, so no nullish fallback is needed —
  // eslint rejects one as an unnecessary condition, and it is right.
  const output = `${result.stdout}${result.stderr}`.trimEnd();

  if (inActions) {
    console.log(output);
    console.log('::endgroup::');
  }

  if (result.status === 0) return { gate, status: 'passed', ms, detail: '' };

  return { gate, status: 'failed', ms, detail: output };
}

const seconds = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

const ICON = { passed: '✓', failed: '✗', skipped: '–' } as const;

function main(): void {
  console.log(`release — ${String(GATES.length)} gates${quick ? ', --quick (heavy gates skipped)' : ''}\n`);

  const outcomes: Outcome[] = [];

  for (const gate of GATES) {
    process.stdout.write(`  ${gate.name} … `);

    const outcome = run(gate);

    outcomes.push(outcome);
    console.log(outcome.status === 'skipped' ? `skipped (${outcome.detail})` : `${outcome.status} ${seconds(outcome.ms)}`);
  }

  const failed = outcomes.filter((outcome) => outcome.status === 'failed');
  const skipped = outcomes.filter((outcome) => outcome.status === 'skipped');

  for (const outcome of failed) {
    console.error(`\n${'─'.repeat(72)}\n✗ ${outcome.gate.name} — ${outcome.gate.proves}\n`);
    // The tail, because the cause of a failure is almost always at the end and
    // the whole of a build log is not readable in a summary.
    console.error(outcome.detail.split('\n').slice(-30).join('\n'));
  }

  console.log(`\n${'─'.repeat(72)}`);

  for (const outcome of outcomes) {
    const time = outcome.status === 'skipped' ? '' : seconds(outcome.ms);
    console.log(`  ${ICON[outcome.status]} ${outcome.gate.name.padEnd(18)} ${time}`);
  }

  const summary = `${String(outcomes.length - failed.length - skipped.length)} passed, ${String(failed.length)} failed, ${String(skipped.length)} skipped`;

  if (failed.length > 0) {
    console.error(`\nNot ready to release — ${summary}.`);
    console.error(`Failed: ${failed.map((outcome) => outcome.gate.name).join(', ')}`);
    process.exit(1);
  }

  if (skipped.length > 0) {
    console.log(`\n${summary}. Skipped gates were not run and prove nothing:`);
    for (const outcome of skipped) console.log(`  ${outcome.gate.name} — ${outcome.detail}`);
    console.log('\nRun without --quick, on a machine with the missing tools, for a full answer.');
    return;
  }

  console.log(`\nReady to release — ${summary}.`);
}

main();
