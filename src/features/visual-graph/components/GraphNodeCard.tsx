import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { GraphNodePresentation } from '../model/graph';
import type { NodeRuntimeStatus } from '../realtime/types';

export type GraphNodeData = {
  label: string;
  presentation: GraphNodePresentation;
  routeHighlighted: boolean;
  runtimeStatus: NodeRuntimeStatus;
  stale: boolean;
  dimmed: boolean;
};

export type GraphFlowNode = Node<GraphNodeData, 'graph-node'>;

export function GraphNodeCard({ data, selected }: NodeProps<GraphFlowNode>) {
  return (
    <div
      className={[
        'graph-node',
        selected ? 'graph-node--selected' : '',
        data.routeHighlighted ? 'graph-node--route' : '',
        `graph-node--${data.runtimeStatus}`,
        data.stale ? 'graph-node--stale' : '',
        data.dimmed ? 'graph-node--dimmed' : '',
      ].join(' ')}
      aria-label={`${data.label}, ${data.runtimeStatus}${data.stale ? ', stale' : ''}`}
    >
      <Handle className="graph-node__handle" isConnectable={false} position={Position.Left} type="target" />
      <span className="graph-node__icon" style={{ backgroundColor: data.presentation.color }}>
        {data.presentation.icon}
      </span>
      <span>
        <strong className="graph-node__label">{data.label}</strong>
        <small className="graph-node__type">{data.presentation.typeLabel}</small>
      </span>
      <span className="graph-node__status" title={data.stale ? 'Runtime data is stale' : data.runtimeStatus}>
        <span aria-hidden="true">{data.stale ? '◷' : runtimeStatusIcon[data.runtimeStatus]}</span>
        {data.runtimeStatus}
      </span>
      <Handle className="graph-node__handle" isConnectable={false} position={Position.Right} type="source" />
    </div>
  );
}

const runtimeStatusIcon: Record<NodeRuntimeStatus, string> = {
  unknown: '?',
  healthy: '✓',
  warning: '!',
  critical: '×',
  offline: '○',
};

