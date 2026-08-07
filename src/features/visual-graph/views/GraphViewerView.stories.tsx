import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { getNetworkNodePresentation, networkGraph } from '../network/networkGraph';
import { GraphViewerView } from './GraphViewerView';

function InteractiveGraphViewerStory() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  return (
    <GraphViewerView
      getNodePresentation={getNetworkNodePresentation}
      graph={networkGraph}
      onNodeSelect={setSelectedNodeId}
      selectedNodeId={selectedNodeId}
    />
  );
}

const meta = {
  title: 'Features/Visual Graph/GraphViewerView',
  component: InteractiveGraphViewerStory,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof GraphViewerView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NetworkTopology: Story = {
};
