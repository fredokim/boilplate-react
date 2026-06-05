import type { Meta, StoryObj } from '@storybook/react-vite';
import { LoginView } from './LoginView';

const meta = {
  title: 'Features/Auth/LoginView',
  component: LoginView,
  args: {
    email: 'demo@example.com',
    password: '',
    isLoading: false,
    onEmailChange: () => undefined,
    onPasswordChange: () => undefined,
    onSubmit: () => undefined,
  },
} satisfies Meta<typeof LoginView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Failed: Story = {
  args: {
    error: 'Invalid credentials.',
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
    password: 'password',
  },
};

export const Filled: Story = {
  args: {
    password: 'password',
  },
};
