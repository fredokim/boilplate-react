import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { GraphNodePresentation } from '../model/graph';

export type GraphNodeData = {
  label: string;
  presentation: GraphNodePresentation;
  routeHighlighted: boolean;
};

export type GraphFlowNode = Node<GraphNodeData, 'graph-node'>;

export function GraphNodeCard({ data, selected }: NodeProps<GraphFlowNode>) {
  return (
    <div
      className={['graph-node', selected ? 'graph-node--selected' : '', data.routeHighlighted ? 'graph-node--route' : ''].join(
        ' ',
      )}
    >
      <Handle className="graph-node__handle" isConnectable={false} position={Position.Left} type="target" />
      <span className="graph-node__icon" style={{ backgroundColor: data.presentation.color }}>
        {data.presentation.icon}
      </span>
      <span>
        <strong className="graph-node__label">{data.label}</strong>
        <small className="graph-node__type">{data.presentation.typeLabel}</small>
      </span>
      <Handle className="graph-node__handle" isConnectable={false} position={Position.Right} type="source" />
    </div>
  );
}

