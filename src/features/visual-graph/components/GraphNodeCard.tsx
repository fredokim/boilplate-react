import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { memo } from 'react';
import type { GraphNodePresentation } from '../model/graph';
import type { GraphNodeVisualState } from '../model/graphInteraction';
import type { GraphDetailLevel } from '../performance/graphViewAdapter';
import type { NodeRuntimeState, NodeRuntimeStatus } from '../realtime/types';

export type GraphNodeData = {
  label: string;
  presentation: GraphNodePresentation;
  visualState: GraphNodeVisualState;
  editable: boolean;
  validationError: boolean;
  detailLevel: GraphDetailLevel;
  runtimeState?: NodeRuntimeState;
  runtimeStale: boolean;
  runtimeFiltered: boolean;
};

export type GraphFlowNode = Node<GraphNodeData, 'graph-node'>;

const runtimeStatusIcon: Record<NodeRuntimeStatus, string> = {
  unknown: '?',
  healthy: '✓',
  warning: '!',
  critical: '×',
  offline: '○',
};

function GraphNodeCardComponent({ data, selected }: NodeProps<GraphFlowNode>) {
  const { dimmed, hovered, routeRole } = data.visualState;
  const status = data.runtimeState?.status ?? 'unknown';
  return (
    <div
      className={[
        'graph-node',
        selected ? 'graph-node--selected' : '',
        hovered ? 'graph-node--hovered' : '',
        dimmed ? 'graph-node--dimmed' : '',
        data.runtimeFiltered ? 'graph-node--runtime-filtered' : '',
        routeRole !== 'none' ? `graph-node--route graph-node--${routeRole}` : '',
        data.validationError ? 'graph-node--error' : '',
        `graph-node--runtime-${status}`,
        data.runtimeStale ? 'graph-node--runtime-stale' : '',
      ].join(' ')}
      aria-label={`${data.label}, ${status}${data.runtimeStale ? ', stale' : ''}`}
      data-route-role={routeRole}
      data-runtime-status={status}
    >
      <Handle className="graph-node__handle" id="input" isConnectable={data.editable} position={Position.Left} type="target" />
      <span className="graph-node__icon" style={{ backgroundColor: data.presentation.color }}>
        {data.presentation.icon}
      </span>
      <span>
        <strong className="graph-node__label">{data.label}</strong>
        {data.detailLevel !== 'compact' ? <small className="graph-node__type">{data.presentation.typeLabel}</small> : null}
      </span>
      {routeRole === 'source' || routeRole === 'destination' ? (
        <span className="graph-node__route-role">{routeRole === 'source' ? 'Start' : 'End'}</span>
      ) : null}
      {data.detailLevel !== 'compact' ? (
        <span className={`graph-node__runtime-badge graph-node__runtime-badge--${status}`} title={data.runtimeStale ? 'Runtime data is stale' : status}>
          <span aria-hidden="true">{data.runtimeStale ? '◷' : runtimeStatusIcon[status]}</span>
          {data.runtimeStale ? 'Stale' : status}
        </span>
      ) : null}
      <Handle className="graph-node__handle" id="output" isConnectable={data.editable} position={Position.Right} type="source" />
    </div>
  );
}

export const GraphNodeCard = memo(GraphNodeCardComponent, (previous, next) =>
  previous.selected === next.selected && previous.data.label === next.data.label && previous.data.detailLevel === next.data.detailLevel && previous.data.editable === next.data.editable && previous.data.validationError === next.data.validationError && previous.data.runtimeState === next.data.runtimeState && previous.data.runtimeStale === next.data.runtimeStale && previous.data.runtimeFiltered === next.data.runtimeFiltered && previous.data.visualState.selected === next.data.visualState.selected && previous.data.visualState.hovered === next.data.visualState.hovered && previous.data.visualState.dimmed === next.data.visualState.dimmed && previous.data.visualState.routeRole === next.data.visualState.routeRole,
);
