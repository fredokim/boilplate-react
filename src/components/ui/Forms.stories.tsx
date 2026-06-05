import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox } from './Checkbox';
import { RadioGroup } from './RadioGroup';
import { Select } from './Select';

const meta = {
  title: 'Atoms/FormControls',
  parameters: {
    layout: 'padded',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function FormControlsDemo() {
  const [role, setRole] = useState('admin');

  return (
    <div className="grid max-w-md gap-5">
      <Select
        label="Role"
        name="role"
        onChange={(event) => setRole(event.target.value)}
        options={[
          { label: 'Admin', value: 'admin' },
          { label: 'Designer', value: 'designer' },
          { label: 'Viewer', value: 'viewer' },
        ]}
        value={role}
      />
      <Checkbox description="Keep this enabled for protected dashboard routes." label="Require authentication" name="auth" />
      <RadioGroup
        label="Session mode"
        name="session"
        onChange={() => undefined}
        options={[
          { label: 'Cookie session', value: 'cookie', description: 'Recommended for secure web auth.' },
          { label: 'Memory token', value: 'memory', description: 'Useful for isolated demos.' },
        ]}
        value="cookie"
      />
    </div>
  );
}

export const Controls: Story = {
  render: () => <FormControlsDemo />,
};

export const SelectError: Story = {
  render: () => (
    <div className="max-w-md">
      <Select
        error="Select a role before saving."
        label="Role"
        name="role"
        options={[
          { label: 'Choose role', value: '' },
          { label: 'Admin', value: 'admin' },
        ]}
      />
    </div>
  ),
};
