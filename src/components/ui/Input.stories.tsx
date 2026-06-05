import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './Input';

const meta = {
  title: 'Atoms/Input',
  component: Input,
  args: {
    label: 'Email',
    placeholder: 'demo@example.com',
  },
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Text: Story = {};

export const Password: Story = {
  args: {
    label: 'Password',
    type: 'password',
  },
};

export const Error: Story = {
  args: {
    error: 'Password must be at least 8 characters.',
  },
};

export const WithHint: Story = {
  args: {
    hint: 'Use the same email as the demo account.',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    value: 'readonly@example.com',
  },
};
