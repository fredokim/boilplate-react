import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const failures: string[] = [];

function walk(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    failures.push(message);
  }
}

const storyFiles = walk(join(root, 'src')).filter((file) => file.endsWith('.stories.tsx'));
const storyText = storyFiles.map((file) => readFileSync(file, 'utf8')).join('\n');
const uiComponents = walk(join(root, 'src/components/ui')).filter(
  (file) => file.endsWith('.tsx') && !file.endsWith('.stories.tsx') && !file.endsWith('.test.tsx'),
);

assert(storyFiles.length > 0, 'No Storybook stories found.');
for (const componentPath of uiComponents) {
  const componentName = componentPath.split(/[\\/]/).pop()?.replace('.tsx', '') ?? '';
  assert(
    storyText.includes(componentName) || existsSync(componentPath.replace('.tsx', '.stories.tsx')),
    `UI component is not covered by Storybook: ${relative(root, componentPath)}`,
  );
}

const schemaFiles = walk(join(root, 'src')).filter((file) => file.endsWith('.schema.ts'));
const testFiles = walk(join(root, 'src')).filter((file) => file.endsWith('.test.ts') || file.endsWith('.test.tsx'));
const testText = testFiles.map((file) => readFileSync(file, 'utf8')).join('\n');
for (const schemaPath of schemaFiles) {
  const schemaName = schemaPath.split(/[\\/]/).pop()?.replace('.ts', '') ?? '';
  assert(testText.includes(schemaName) || testText.includes(schemaName.replace('.schema', 'Schema')), `Schema has no validation test reference: ${relative(root, schemaPath)}`);
}

const registryPath = join(root, 'src/test/msw/mockRegistry.ts');
assert(existsSync(registryPath), 'Missing MSW mock registry.');
if (existsSync(registryPath)) {
  const registry = readFileSync(registryPath, 'utf8');
  assert(registry.includes('mockRegistry'), 'Mock registry must export mockRegistry.');
  assert(registry.includes('endpoint'), 'Mock registry entries must include endpoint metadata.');
}

for (const generator of ['scripts/generate-contract.ts', 'scripts/generate-layout.ts', 'scripts/generate-page.ts', 'scripts/generate-form.ts']) {
  assert(existsSync(join(root, generator)), `Missing automation generator: ${generator}`);
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log('Automation checks passed.');
