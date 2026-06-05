import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';
import { Card } from './Card';

const meta = {
  title: 'Atoms/Card',
  component: Card,
  args: {
    title: 'Profile contract',
    description: 'DTO validation guards this view before rendering.',
    children: <p className="m-0 text-sm text-muted">Card content area</p>,
  },
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAction: Story = {
  args: {
    action: <Button size="sm">Refresh</Button>,
  },
};

export const ContentOnly: Story = {
  render: () => (
    <Card>
      <dl className="m-0 grid gap-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="font-semibold text-muted">Status</dt>
          <dd className="m-0 text-ink">Ready</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="font-semibold text-muted">Boundary</dt>
          <dd className="m-0 text-ink">Client UI</dd>
        </div>
      </dl>
    </Card>
  ),
};
