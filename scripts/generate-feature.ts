import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const featureName = process.argv[2];

if (!featureName) {
  throw new Error('Usage: npm run generate:feature -- featureName');
}

const pascalName = featureName
  .split('-')
  .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
  .join('');

const baseDir = join(process.cwd(), 'src', 'features', featureName);

for (const dir of ['api', 'containers', 'dto', 'hooks', 'views']) {
  mkdirSync(join(baseDir, dir), { recursive: true });
}

writeFileSync(
  join(baseDir, 'dto', `${pascalName}.dto.ts`),
  `import { IsString } from 'class-validator';\n\nexport class ${pascalName}Dto {\n  @IsString()\n  id = '';\n}\n`,
);

writeFileSync(
  join(baseDir, 'views', `${pascalName}View.tsx`),
  `export function ${pascalName}View() {\n  return <div>${pascalName}</div>;\n}\n`,
);

writeFileSync(
  join(baseDir, 'containers', `${pascalName}Container.tsx`),
  `import { ${pascalName}View } from '../views/${pascalName}View';\n\nexport default function ${pascalName}Container() {\n  return <${pascalName}View />;\n}\n`,
);

console.log(`Created feature: ${featureName}`);
