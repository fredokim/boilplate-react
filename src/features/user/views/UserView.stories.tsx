import type { Meta, StoryObj } from '@storybook/react-vite';
import { UserView } from './UserView';

const meta = {
  title: 'Features/User/UserView',
  component: UserView,
  args: {
    user: {
      id: 'user-demo',
      name: 'Demo Admin',
      email: 'demo@example.com',
      role: 'admin',
    },
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof UserView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
