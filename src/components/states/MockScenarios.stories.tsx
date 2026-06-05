import type { Meta, StoryObj } from '@storybook/react-vite';

import { mockRegistry } from '../../test/msw/mockRegistry';

function MockScenarioMatrix() {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-surface text-xs font-semibold uppercase text-muted">
          <tr>
            <th className="px-4 py-3">Method</th>
            <th className="px-4 py-3">Endpoint</th>
            <th className="px-4 py-3">Scenarios</th>
          </tr>
        </thead>
        <tbody>
          {mockRegistry.map((entry) => {
            const scenarios = ['success', 'empty', 'invalid', 'error', 'timeout'].filter(
              (key) => key in entry,
            );

            return (
              <tr className="border-t border-line" key={`${entry.method}:${entry.endpoint}`}>
                <td className="px-4 py-3 font-semibold text-ink">{entry.method}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink">{entry.endpoint}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {scenarios.map((scenario) => (
                      <span className="rounded-full bg-surface px-2 py-1 text-xs font-medium text-muted" key={scenario}>
                        {scenario}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const meta = {
  title: 'Automation/Mock Scenarios',
  component: MockScenarioMatrix,
} satisfies Meta<typeof MockScenarioMatrix>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Registry: Story = {};
