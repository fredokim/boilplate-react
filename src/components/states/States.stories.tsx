import type { Meta, StoryObj } from '@storybook/react-vite';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';

const meta = {
  title: 'States/Common',
  parameters: {
    layout: 'padded',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  render: () => <LoadingState label="Loading users" />,
};

export const Empty: Story = {
  render: () => (
    <EmptyState
      actionLabel="Create user"
      description="Adjust filters or create the first user."
      onAction={() => undefined}
      title="No users found"
    />
  ),
};

export const Error: Story = {
  render: () => (
    <ErrorState
      failure={{
        origin: 'backend',
        kind: 'server',
        message: 'The user API returned an invalid response.',
      }}
      onRetry={() => undefined}
      title="User loading failed"
    />
  ),
};
