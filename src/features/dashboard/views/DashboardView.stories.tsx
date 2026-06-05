import { createRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DashboardView } from './DashboardView';

const users = [
  { id: 'user-1', name: 'Admin User', email: 'admin@example.com', role: 'admin' },
  { id: 'user-2', name: 'Product Owner', email: 'owner@example.com', role: 'owner' },
  { id: 'user-3', name: 'Designer', email: 'design@example.com', role: 'viewer' },
];

const meta = {
  title: 'Features/Dashboard/DashboardView',
  component: DashboardView,
  args: {
    users,
    status: 'success',
    onRetry: () => undefined,
    sentinelRef: createRef<HTMLDivElement>(),
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DashboardView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Success: Story = {};

export const Loading: Story = {
  args: {
    status: 'pending',
  },
};

export const Empty: Story = {
  args: {
    users: [],
  },
};

export const Error: Story = {
  args: {
    status: 'error',
    failure: {
      origin: 'frontend',
      kind: 'validation',
      message: 'API response did not match the frontend DTO contract.',
    },
  },
};
