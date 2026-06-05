import type { Meta, StoryObj } from '@storybook/react-vite';
import { ResultBoundary } from './ResultBoundary';

const meta = {
  title: 'States/ResultBoundary',
  component: ResultBoundary,
} satisfies Meta<typeof ResultBoundary>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  args: {
    status: 'pending',
    children: 'content',
  },
};

export const Error: Story = {
  args: {
    status: 'error',
    failure: {
      origin: 'backend',
      kind: 'server',
      message: 'Mock server failed.',
    },
    children: 'content',
  },
};

export const Empty: Story = {
  args: {
    status: 'success',
    isEmpty: true,
    children: 'content',
  },
};
