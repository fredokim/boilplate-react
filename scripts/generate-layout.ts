import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [, , rawName] = process.argv;

if (!rawName) {
  throw new Error('Usage: npm run generate -- layout <name>');
}

const kebabName = rawName.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/\s+/g, '-').toLowerCase();
const pascalName = kebabName
  .split('-')
  .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
  .join('');

function write(path: string, content: string) {
  mkdirSync(join(process.cwd(), path, '..'), { recursive: true });
  writeFileSync(join(process.cwd(), path), content);
}

write(
  `src/components/layouts/${pascalName}Layout.tsx`,
  `import type { PropsWithChildren, ReactNode } from 'react';\nimport { Card } from '@ui/Card';\n\nexport type ${pascalName}LayoutProps = PropsWithChildren<{\n  title: string;\n  description?: string;\n  actions?: ReactNode;\n  toolbar?: ReactNode;\n}>;\n\nexport function ${pascalName}Layout({ actions, children, description, title, toolbar }: ${pascalName}LayoutProps) {\n  return (\n    <div className="page-grid">\n      <header className="page-heading">\n        <div>\n          <h1 className="m-0 text-2xl font-black text-ink">{title}</h1>\n          {description ? <p className="mt-2 text-sm text-muted">{description}</p> : null}\n        </div>\n        {actions}\n      </header>\n      {toolbar ? <Card>{toolbar}</Card> : null}\n      <section>{children}</section>\n    </div>\n  );\n}\n`,
);
write(
  `src/components/layouts/${pascalName}Layout.stories.tsx`,
  `import type { Meta, StoryObj } from '@storybook/react-vite';\nimport { Button } from '@ui/Button';\nimport { ${pascalName}Layout } from './${pascalName}Layout';\n\nconst meta = {\n  title: 'Layouts/${pascalName}Layout',\n  component: ${pascalName}Layout,\n  args: {\n    title: '${pascalName}',\n    description: 'Generated responsive page layout shell.',\n    actions: <Button size="sm">Create</Button>,\n    toolbar: <span>Toolbar slot</span>,\n    children: <div className="rounded-md border border-line bg-white p-5">Content slot</div>,\n  },\n} satisfies Meta<typeof ${pascalName}Layout>;\n\nexport default meta;\n\ntype Story = StoryObj<typeof meta>;\n\nexport const Default: Story = {};\n`,
);

console.log(`Generated layout: ${kebabName}`);

