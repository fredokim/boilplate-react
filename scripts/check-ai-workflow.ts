import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures: string[] = [];

function readRequired(path: string) {
  const absolutePath = join(root, path);

  if (!existsSync(absolutePath)) {
    failures.push(`Missing required AI workflow file: ${path}`);
    return '';
  }

  return readFileSync(absolutePath, 'utf8');
}

function assertIncludes(text: string, token: string, file: string) {
  if (!text.includes(token)) {
    failures.push(`${file} must include "${token}".`);
  }
}

const requiredDocs = [
  'AI_WORKFLOW.md',
  'PROMPT_PLAYBOOK.md',
  'CODE_REVIEW_CHECKLIST.md',
  'AI_REFACTORING_CASE_STUDY.md',
  'PERFORMANCE_REPORT.md',
  'I18N_STRATEGY.md',
  'AI_CHANGELOG.md',
  '.github/PULL_REQUEST_TEMPLATE.md',
];

const docs = new Map(requiredDocs.map((path) => [path, readRequired(path)]));

function doc(path: string) {
  return docs.get(path) ?? '';
}

assertIncludes(doc('AI_WORKFLOW.md'), 'Developer-Owned Decisions', 'AI_WORKFLOW.md');
assertIncludes(doc('AI_WORKFLOW.md'), 'TanStack Query', 'AI_WORKFLOW.md');
assertIncludes(doc('AI_WORKFLOW.md'), 'Zustand', 'AI_WORKFLOW.md');
assertIncludes(doc('PROMPT_PLAYBOOK.md'), 'Verification', 'PROMPT_PLAYBOOK.md');
assertIncludes(doc('PROMPT_PLAYBOOK.md'), 'Before editing', 'PROMPT_PLAYBOOK.md');
assertIncludes(doc('CODE_REVIEW_CHECKLIST.md'), 'AI-Specific Review', 'CODE_REVIEW_CHECKLIST.md');
assertIncludes(doc('AI_REFACTORING_CASE_STUDY.md'), 'Human Decisions', 'AI_REFACTORING_CASE_STUDY.md');
assertIncludes(doc('PERFORMANCE_REPORT.md'), 'npm run check:bundle', 'PERFORMANCE_REPORT.md');
assertIncludes(doc('I18N_STRATEGY.md'), 'fallback locale', 'I18N_STRATEGY.md');
assertIncludes(doc('.github/PULL_REQUEST_TEMPLATE.md'), 'AI Usage', '.github/PULL_REQUEST_TEMPLATE.md');
assertIncludes(doc('.github/PULL_REQUEST_TEMPLATE.md'), 'State ownership is clear', '.github/PULL_REQUEST_TEMPLATE.md');

const readme = readRequired('README.md');
for (const doc of requiredDocs.filter((path) => path.endsWith('.md') && !path.startsWith('.github'))) {
  assertIncludes(readme, doc, 'README.md');
}

const aiGuide = readRequired('AI_DEVELOPMENT_GUIDE.md');
for (const doc of ['AI_WORKFLOW.md', 'PROMPT_PLAYBOOK.md', 'CODE_REVIEW_CHECKLIST.md']) {
  assertIncludes(aiGuide, doc, 'AI_DEVELOPMENT_GUIDE.md');
}

const packageJson = readRequired('package.json');
assertIncludes(packageJson, '"check:ai"', 'package.json');
assertIncludes(packageJson, 'npm run check:ai', 'package.json');

const ciWorkflow = readRequired('.github/workflows/ci.yml');
assertIncludes(ciWorkflow, 'npm run check:ai', '.github/workflows/ci.yml');

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log('AI workflow checks passed.');
