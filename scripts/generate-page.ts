import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [, , rawName, rawPreset = 'list'] = process.argv;

if (!rawName) {
  throw new Error('Usage: npm run generate -- page <name> [list|detail|form|dashboard|settings]');
}

const preset = ['list', 'detail', 'form', 'dashboard', 'settings'].includes(rawPreset) ? rawPreset : 'list';
const kebabName = rawName.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/\s+/g, '-').toLowerCase();
const pascalName = kebabName
  .split('-')
  .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
  .join('');
const base = `src/features/${kebabName}`;

function write(path: string, content: string) {
  mkdirSync(join(process.cwd(), path, '..'), { recursive: true });
  writeFileSync(join(process.cwd(), path), content);
}

write(
  `${base}/views/${pascalName}Page.tsx`,
  `import { Card } from '@ui/Card';\nimport { EmptyState } from '@/components/states/EmptyState';\nimport { ErrorState } from '@/components/states/ErrorState';\nimport { LoadingState } from '@/components/states/LoadingState';\n\nexport type ${pascalName}PageProps = {\n  status: 'idle' | 'pending' | 'success' | 'error';\n};\n\nexport function ${pascalName}Page({ status }: ${pascalName}PageProps) {\n  if (status === 'idle' || status === 'pending') {\n    return <LoadingState label="Loading ${pascalName}" />;\n  }\n\n  if (status === 'error') {\n    return <ErrorState title="${pascalName} failed" />;\n  }\n\n  return (\n    <div className="page-grid">\n      <header className="page-heading">\n        <div>\n          <h1 className="m-0 text-2xl font-black text-ink">${pascalName}</h1>\n          <p className="mt-2 text-sm text-muted">Generated ${preset} page preset.</p>\n        </div>\n      </header>\n      <Card title="${pascalName} content" description="Replace this generated shell with feature-specific UI.">\n        <EmptyState title="No ${kebabName} data yet" description="Connect DTO, mock data, and query hooks here." />\n      </Card>\n    </div>\n  );\n}\n`,
);
write(
  `${base}/containers/${pascalName}PageContainer.tsx`,
  `import { ${pascalName}Page } from '../views/${pascalName}Page';\n\nexport default function ${pascalName}PageContainer() {\n  return <${pascalName}Page status="success" />;\n}\n`,
);
write(
  `${base}/views/${pascalName}Page.stories.tsx`,
  `import type { Meta, StoryObj } from '@storybook/react-vite';\nimport { ${pascalName}Page } from './${pascalName}Page';\n\nconst meta = {\n  title: 'Pages/${pascalName}',\n  component: ${pascalName}Page,\n  args: { status: 'success' },\n  parameters: { layout: 'fullscreen' },\n} satisfies Meta<typeof ${pascalName}Page>;\n\nexport default meta;\n\ntype Story = StoryObj<typeof meta>;\n\nexport const Success: Story = {};\nexport const Loading: Story = { args: { status: 'pending' } };\nexport const Error: Story = { args: { status: 'error' } };\n`,
);
write(
  `${base}/routes/${kebabName}.route.tsx`,
  `import type { AppRouteConfig } from '@app/router/routeRegistry';\n\nconst route = {\n  path: '/${kebabName}',\n  title: '${pascalName}',\n  auth: true,\n  permission: '${kebabName}:read',\n  nav: true,\n  loader: () => import('../containers/${pascalName}PageContainer'),\n} satisfies AppRouteConfig;\n\nexport default route;\n`,
);
write(
  `${base}/PAGE_SPEC.md`,
  `# ${pascalName} Page\n\n- Type: ${preset}\n- Route: /${kebabName}\n- Auth: required\n- Permission: ${kebabName}:read\n- States: loading, empty, error, success\n- Layout: app-shell\n- Registry: routes/${kebabName}.route.tsx\n`,
);

console.log(`Generated page: ${kebabName} (${preset})`);

