import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './Badge';

const meta = {
  title: 'Atoms/Badge',
  component: Badge,
  args: {
    children: 'Admin',
  },
  argTypes: {
    tone: {
      control: 'select',
      options: ['neutral', 'success', 'danger', 'primary'],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Neutral: Story = {};

export const Success: Story = {
  args: {
    children: 'Active',
    tone: 'success',
  },
};

export const Danger: Story = {
  args: {
    children: 'Blocked',
    tone: 'danger',
  },
};

export const Primary: Story = {
  args: {
    children: 'Owner',
    tone: 'primary',
  },
};

export const AllTones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge>Neutral</Badge>
      <Badge tone="success">Success</Badge>
      <Badge tone="danger">Danger</Badge>
      <Badge tone="primary">Primary</Badge>
    </div>
  ),
};
