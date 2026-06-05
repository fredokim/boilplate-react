import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';
import { Modal } from './Modal';
import { Tabs } from './Tabs';
import { Toast } from './Toast';

const meta = {
  title: 'Molecules/OverlayAndNavigation',
  parameters: {
    layout: 'padded',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function TabbedPanelDemo() {
  const [activeId, setActiveId] = useState('overview');

  return (
    <Tabs
      activeId={activeId}
      items={[
        { id: 'overview', label: 'Overview', content: <p className="m-0 text-sm text-muted">Project summary and health.</p> },
        { id: 'api', label: 'API', content: <p className="m-0 text-sm text-muted">DTO validation and request status.</p> },
        { id: 'logs', label: 'Logs', content: <p className="m-0 text-sm text-muted">Observability adapter events.</p> },
      ]}
      onChange={setActiveId}
    />
  );
}

export const ModalOpen: Story = {
  render: () => (
    <Modal description="Only the inner content changes between use cases." onClose={() => undefined} open title="Confirm deployment">
      <div className="grid gap-4">
        <p className="m-0 text-sm text-muted">This shared modal can host forms, confirmations, and detail views.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary">Cancel</Button>
          <Button>Deploy</Button>
        </div>
      </div>
    </Modal>
  ),
};

export const TabbedPanel: Story = {
  render: () => <TabbedPanelDemo />,
};

export const Toasts: Story = {
  render: () => (
    <div className="grid max-w-md gap-3">
      <Toast message="The user list was refreshed." title="Saved" tone="success" />
      <Toast message="DTO parsing failed before rendering." title="Contract warning" />
      <Toast message="The API returned a server error." title="Request failed" tone="danger" />
    </div>
  ),
};
