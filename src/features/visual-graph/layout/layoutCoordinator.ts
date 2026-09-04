import type { GraphDocument, GraphPosition } from '../model/graph';
import { dagreLayoutService } from './dagreLayout';

export type LayoutPositions = Readonly<Record<string, GraphPosition>>;
export type LayoutExecutor = (graph: GraphDocument) => Promise<LayoutPositions>;
export type LayoutResponse = { status: 'applied'; graph: GraphDocument } | { status: 'stale' } | { status: 'error'; message: string };

export function createLayoutCoordinator(executor: LayoutExecutor) {
  let latestRequestId = 0;
  return { async layout(graph: GraphDocument): Promise<LayoutResponse> {
    const requestId = ++latestRequestId;
    try {
      const positions = await executor(graph);
      if (requestId !== latestRequestId) return { status: 'stale' };
      return { status: 'applied', graph: { ...graph, nodes: graph.nodes.map((node) => ({ ...node, position: positions[node.id] ?? node.position })) } };
    } catch (error) { return { status: 'error', message: error instanceof Error ? error.message : 'Layout failed.' }; }
  } };
}

export const fallbackLayoutExecutor: LayoutExecutor = async (graph) => Object.fromEntries(dagreLayoutService.layout(graph).nodes.map((node) => [node.id, node.position]));

export function createWorkerLayoutExecutor(): LayoutExecutor {
  if (typeof Worker === 'undefined') return fallbackLayoutExecutor;
  return (graph) => new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./layout.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<{ positions?: LayoutPositions; error?: string }>) => { worker.terminate(); if (event.data.error) reject(new Error(event.data.error)); else resolve(event.data.positions ?? {}); };
    worker.onerror = () => { worker.terminate(); fallbackLayoutExecutor(graph).then(resolve).catch(reject); };
    worker.postMessage({ nodes: graph.nodes.map(({ id }) => ({ id })), edges: graph.edges.map(({ sourceNodeId, targetNodeId }) => ({ sourceNodeId, targetNodeId })) });
  });
}
