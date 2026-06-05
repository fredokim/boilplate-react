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
const failures: string[] = [];

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
    const max = frameworkPackages.has(name) ? frameworkMaxBytes : defaultMaxBytes;

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
