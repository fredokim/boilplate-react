import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

type PackageJson = {
  dependencies?: Record<string, string>;
};

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as PackageJson;
const frameworkPackages = new Set(['react', 'react-dom']);
const defaultMaxBytes = 6 * 1024 * 1024;
const frameworkMaxBytes = 80 * 1024 * 1024;

// The strategy document says an oversized runtime dependency needs a written
// reason. Raising a cap here is therefore only half of it: the package must also
// be named in that document, so the exception cannot be granted silently.
const documentedExceptions = new Map<string, number>([['hls.js', 40 * 1024 * 1024]]);

const strategyPath = join(root, 'docs', 'development', 'DEPENDENCY_STRATEGY.md');

// Loudly, not as an empty string. This used to fall back to '' when the file was
// missing, so moving the document into `docs/` produced "hls.js has no recorded
// reason" — an accusation about a dependency, for a problem with a path.
if (!existsSync(strategyPath)) {
  console.error(`check:deps — cannot read ${strategyPath}. Every raised cap is checked against it.`);
  process.exit(1);
}

const strategyDoc = readFileSync(strategyPath, 'utf8');

const failures: string[] = [];

for (const name of documentedExceptions.keys()) {
  if (!strategyDoc.includes(name)) {
    failures.push(`${name} has a raised size cap but no reason recorded in DEPENDENCY_STRATEGY.md.`);
  }
}

function packagePath(packageName: string) {
  if (packageName.startsWith('@')) {
    const [scope, name] = packageName.split('/');
    return join(root, 'node_modules', scope ?? '', name ?? '');
  }

  return join(root, 'node_modules', packageName);
}

function directorySize(path: string): number {
  return readdirSync(path, { withFileTypes: true }).reduce((total, entry) => {
    const child = join(path, entry.name);
    return total + (entry.isDirectory() ? directorySize(child) : statSync(child).size);
  }, 0);
}

const rows = Object.keys(packageJson.dependencies ?? {})
  .map((name) => {
    const path = packagePath(name);
    const size = existsSync(path) ? directorySize(path) : 0;
    const max = frameworkPackages.has(name)
      ? frameworkMaxBytes
      : (documentedExceptions.get(name) ?? defaultMaxBytes);

    if (size > max) {
      failures.push(`${name} is ${(size / 1024 / 1024).toFixed(2)}MB, max ${(max / 1024 / 1024).toFixed(0)}MB.`);
    }

    return { name, size };
  })
  .sort((a, b) => b.size - a.size);

console.table(
  rows.slice(0, 10).map((row) => ({
    package: row.name,
    mb: Number((row.size / 1024 / 1024).toFixed(2)),
  })),
);

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log('Dependency size check passed.');
