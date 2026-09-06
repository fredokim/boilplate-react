import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Creates a feature that matches docs/development/FEATURE_CONTRACT.md.
 *
 * It used to create three files and two empty directories, and the result was
 * unreachable: the router collects `@features/** /routes/*.route.tsx` and this
 * never wrote one, so a generated feature had no path. It also wrote no story
 * and no test, which meant every use of it moved the repository further from
 * its own conventions.
 */

const args = process.argv.slice(2);

/**
 * `--api` adds the api module, its DTO, and the query hook.
 *
 * Off by default, and that default is load-bearing. A generated api module
 * calls a URL derived from the feature name, which the server almost certainly
 * does not publish yet — and the contract test reads those URLs and compares
 * them against the published spec, so scaffolding would turn CI red before a
 * line of code was written. Asking for it makes the failure something the
 * author chose and can act on. `features/dashboard` shows a feature with no
 * api module is a normal shape here, not a deficiency.
 */
const withApi = args.includes('--api');
const rawName = args.find((arg) => !arg.startsWith('--'));

if (rawName === undefined || rawName.trim() === '') {
  throw new Error('Usage: npm run generate:feature -- feature-name [--api]');
}

const featureName = rawName.trim();

/**
 * A name becomes a directory, so it must not be able to escape one. This is
 * why `../../etc` is rejected rather than resolved.
 */
if (!/^[a-z][a-z0-9-]*$/.test(featureName)) {
  throw new Error(
    `Invalid feature name: ${featureName}. Use lower-case letters, digits and hyphens, starting with a letter.`,
  );
}

const pascalName = featureName
  .split('-')
  .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
  .join('');

const camelName = `${pascalName.charAt(0).toLowerCase()}${pascalName.slice(1)}`;

const baseDir = join(process.cwd(), 'src', 'features', featureName);

const dataFiles: Record<string, string> = {
  [`dto/${pascalName}.dto.ts`]: `import { Type } from 'class-transformer';
import { IsString, ValidateNested } from 'class-validator';

export class ${pascalName}Dto {
  @IsString()
  id = '';

  @IsString()
  name = '';
}

export class ${pascalName}ListDto {
  @ValidateNested({ each: true })
  @Type(() => ${pascalName}Dto)
  items: ${pascalName}Dto[] = [];
}
`,

  [`api/${camelName}.api.ts`]: `import { requestDto } from '@core/api/apiClient';
import { ${pascalName}Dto, ${pascalName}ListDto } from '../dto/${pascalName}.dto';

/**
 * The server may not publish these paths yet. The contract test in
 * \`src/test/contract\` reads the URLs from this file and checks them against the
 * published OpenAPI document, so an endpoint that does not exist fails there
 * rather than in the browser.
 */
export const ${camelName}Api = {
  detail: (id: string) =>
    requestDto(
      {
        method: 'GET',
        url: \`/${featureName}/\${id}\`,
      },
      ${pascalName}Dto,
    ),
  list: () =>
    requestDto(
      {
        method: 'GET',
        url: '/${featureName}',
      },
      ${pascalName}ListDto,
    ),
};
`,

  [`hooks/use${pascalName}Query.ts`]: `import { useQuery } from '@tanstack/react-query';
import { ${camelName}Api } from '../api/${camelName}.api';

export function use${pascalName}Query(id: string) {
  return useQuery({
    queryKey: ['${featureName}', id],
    queryFn: () => ${camelName}Api.detail(id),
    enabled: Boolean(id),
  });
}

export function use${pascalName}ListQuery() {
  return useQuery({
    queryKey: ['${featureName}'],
    queryFn: ${camelName}Api.list,
  });
}
`,

};

const files: Record<string, string> = {
  ...(withApi ? dataFiles : {}),

  [`views/${pascalName}View.tsx`]: `export type ${pascalName}ViewProps = {
  title?: string;
};

export function ${pascalName}View({ title = '${pascalName}' }: ${pascalName}ViewProps) {
  return (
    <section>
      <h1>{title}</h1>
    </section>
  );
}
`,

  [`views/${pascalName}View.stories.tsx`]: `import type { Meta, StoryObj } from '@storybook/react-vite';
import { ${pascalName}View } from './${pascalName}View';

const meta = {
  title: 'Features/${pascalName}/${pascalName}View',
  component: ${pascalName}View,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ${pascalName}View>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
`,

  [`views/${pascalName}View.test.tsx`]: `import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ${pascalName}View } from './${pascalName}View';

describe('${pascalName}View', () => {
  it('renders the title it is given', () => {
    render(<${pascalName}View title="Given title" />);

    expect(screen.getByRole('heading', { name: 'Given title' })).toBeInTheDocument();
  });
});
`,

  [`containers/${pascalName}Container.tsx`]: `import { ${pascalName}View } from '../views/${pascalName}View';

export default function ${pascalName}Container() {
  return <${pascalName}View />;
}
`,

  [`routes/${camelName}.route.tsx`]: `import type { AppRouteConfig } from '@app/router/routeRegistry';

/**
 * Registered by the router's glob over \`features/** /routes/*.route.tsx\`; no
 * edit to routeRegistry.tsx is needed.
 *
 * \`auth\` is true and \`nav\` is false by default: a new screen exposed without
 * authentication is worse than one that is briefly unreachable, and an
 * unfinished screen should not appear in navigation on its own.
 */
export default {
  path: '/${featureName}',
  title: '${pascalName}',
  auth: true,
  nav: false,
  loader: () => import('../containers/${pascalName}Container'),
} satisfies AppRouteConfig;
`,
};

/**
 * Nothing is written until every target has been checked. A generator that
 * fails half way leaves a feature that is neither absent nor complete.
 */
const existing = Object.keys(files).filter((relative) => existsSync(join(baseDir, relative)));

if (existing.length > 0) {
  throw new Error(
    [
      `Feature "${featureName}" already has these files:`,
      ...existing.map((relative) => `  src/features/${featureName}/${relative}`),
      'Delete them first if you meant to regenerate it.',
    ].join('\n'),
  );
}

for (const [relative, contents] of Object.entries(files)) {
  const target = join(baseDir, relative);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents, 'utf8');
}

console.log(`Created feature: ${featureName} (${String(Object.keys(files).length)} files)`);
console.log(`Route: /${featureName} (auth required, hidden from nav)`);

if (withApi) {
  console.log(
    `The api module calls /${featureName}. Until the server publishes it, ` +
      '`npm run check:contract` will fail — which is the check doing its job.',
  );
} else {
  console.log('No api module. Re-run with --api if this feature talks to the server.');
}
