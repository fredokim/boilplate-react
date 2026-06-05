import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [, , rawName] = process.argv;

if (!rawName) {
  throw new Error('Usage: npm run generate -- form <name>');
}

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
  `${base}/views/${pascalName}Form.tsx`,
  `import { Button } from '@ui/Button';\nimport { Input } from '@ui/Input';\nimport type { FieldErrors } from '@core/form/fieldErrors';\nimport type { ${pascalName}Input } from '../schemas/${kebabName}.schema';\n\nexport type ${pascalName}FormProps = {\n  value: ${pascalName}Input;\n  errors?: FieldErrors<keyof ${pascalName}Input & string>;\n  isSubmitting?: boolean;\n  onChange: (value: ${pascalName}Input) => void;\n  onSubmit: () => void;\n};\n\nexport function ${pascalName}Form({ errors = {}, isSubmitting = false, onChange, onSubmit, value }: ${pascalName}FormProps) {\n  return (\n    <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>\n      <Input\n        error={errors.name}\n        label="Name"\n        name="name"\n        onChange={(event) => onChange({ ...value, name: event.target.value })}\n        value={value.name}\n      />\n      <Button isLoading={isSubmitting} type="submit">Save ${pascalName}</Button>\n    </form>\n  );\n}\n`,
);
write(
  `${base}/views/${pascalName}Form.stories.tsx`,
  `import { useState } from 'react';\nimport type { Meta, StoryObj } from '@storybook/react-vite';\nimport { ${pascalName}Form } from './${pascalName}Form';\nimport type { ${pascalName}Input } from '../schemas/${kebabName}.schema';\n\nconst meta = {\n  title: 'Forms/${pascalName}Form',\n  component: ${pascalName}Form,\n} satisfies Meta<typeof ${pascalName}Form>;\n\nexport default meta;\n\ntype Story = StoryObj<typeof meta>;\n\nfunction Demo() {\n  const [value, setValue] = useState<${pascalName}Input>({ name: '${pascalName}' });\n  return <${pascalName}Form onChange={setValue} onSubmit={() => undefined} value={value} />;\n}\n\nexport const Default: Story = { render: () => <Demo /> };\nexport const Error: Story = { args: { value: { name: '' }, errors: { name: 'Name is required.' }, onChange: () => undefined, onSubmit: () => undefined } };\n`,
);
write(
  `${base}/views/${pascalName}Form.test.tsx`,
  `import { render, screen } from '@testing-library/react';\nimport { ${pascalName}Form } from './${pascalName}Form';\n\ndescribe('${pascalName}Form', () => {\n  it('renders generated form fields', () => {\n    render(<${pascalName}Form onChange={() => undefined} onSubmit={() => undefined} value={{ name: '${pascalName}' }} />);\n\n    expect(screen.getByLabelText('Name')).toBeInTheDocument();\n  });\n});\n`,
);

console.log(`Generated form: ${kebabName}`);
