import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { spawnSync } from 'node:child_process';

type GeneratorKind = 'feature' | 'component' | 'contract' | 'dto' | 'hook' | 'layout' | 'page' | 'form';

const [kind, rawName] = process.argv.slice(2) as [GeneratorKind | undefined, string | undefined];

if (!kind || !rawName) {
  throw new Error('Usage: npm run generate -- <feature|component|contract|dto|hook|layout|page|form> <name>');
}

const kebabName = rawName.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/\s+/g, '-').toLowerCase();
const pascalName = kebabName
  .split('-')
  .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
  .join('');
const camelName = `${pascalName.charAt(0).toLowerCase()}${pascalName.slice(1)}`;

const write = (path: string, content: string) => {
  mkdirSync(join(process.cwd(), path, '..'), { recursive: true });
  writeFileSync(join(process.cwd(), path), content);
};

if (kind === 'contract') {
  const result = spawnSync('tsx', ['scripts/generate-contract.ts', rawName], {
    stdio: 'inherit',
    shell: true,
  });
  process.exit(result.status ?? 1);
}

if (kind === 'layout' || kind === 'page' || kind === 'form') {
  const result = spawnSync('tsx', [`scripts/generate-${kind}.ts`, rawName, ...process.argv.slice(4)], {
    stdio: 'inherit',
    shell: true,
  });
  process.exit(result.status ?? 1);
}

if (kind === 'feature') {
  const base = `src/features/${kebabName}`;
  for (const dir of ['api', 'containers', 'dto', 'hooks', 'views']) {
    mkdirSync(join(process.cwd(), base, dir), { recursive: true });
  }
  write(`${base}/dto/${pascalName}.dto.ts`, `import { IsString } from 'class-validator';\n\nexport class ${pascalName}Dto {\n  @IsString()\n  id = '';\n}\n`);
  write(`${base}/views/${pascalName}View.tsx`, `export function ${pascalName}View() {\n  return <section>${pascalName}</section>;\n}\n`);
}

if (kind === 'component') {
  write(`src/components/ui/${pascalName}.tsx`, `type ${pascalName}Props = {\n  label?: string;\n};\n\nexport function ${pascalName}({ label = '${pascalName}' }: ${pascalName}Props) {\n  return <div className="rounded-md border border-line bg-white p-4 text-sm font-semibold text-ink">{label}</div>;\n}\n`);
  write(`src/components/ui/${pascalName}.stories.tsx`, `import type { Meta, StoryObj } from '@storybook/react-vite';\nimport { ${pascalName} } from './${pascalName}';\n\nconst meta = {\n  title: 'Atoms/${pascalName}',\n  component: ${pascalName},\n  args: {\n    label: '${pascalName}',\n  },\n} satisfies Meta<typeof ${pascalName}>;\n\nexport default meta;\n\ntype Story = StoryObj<typeof meta>;\n\nexport const Default: Story = {};\n`);
  write(`src/components/ui/${pascalName}.test.tsx`, `import { render, screen } from '@testing-library/react';\nimport { ${pascalName} } from './${pascalName}';\n\ndescribe('${pascalName}', () => {\n  it('renders label', () => {\n    render(<${pascalName} label="${pascalName}" />);\n\n    expect(screen.getByText('${pascalName}')).toBeInTheDocument();\n  });\n});\n`);
}

if (kind === 'dto') {
  write(`src/features/${kebabName}/dto/${pascalName}.dto.ts`, `import { IsString } from 'class-validator';\n\nexport class ${pascalName}Dto {\n  @IsString()\n  id = '';\n}\n`);
}

if (kind === 'hook') {
  write(`src/hooks/use${pascalName}.ts`, `export function use${pascalName}() {\n  return { ${camelName}: true };\n}\n`);
}

console.log(`Generated ${kind}: ${kebabName}`);
