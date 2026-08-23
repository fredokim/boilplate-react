import { z } from 'zod';
import type { GraphDocument } from '../model/graph';
import { validateGraphStructure } from './graphValidation';

export const GRAPH_SCHEMA_VERSION = 1 as const;

const metadataSchema = z.record(z.string(), z.unknown());
const positionSchema = z.object({ x: z.number().finite(), y: z.number().finite() });
const nodeSchema = z.object({ id: z.string().min(1), type: z.string().min(1), label: z.string(), position: positionSchema, metadata: metadataSchema });
const edgeSchema = z.object({ id: z.string().min(1), sourceNodeId: z.string().min(1), targetNodeId: z.string().min(1), label: z.string().optional(), sourcePortId: z.string().optional(), targetPortId: z.string().optional(), metadata: metadataSchema });
const groupSchema = z.object({ id: z.string().min(1), name: z.string().min(1), childNodeIds: z.array(z.string()), expanded: z.boolean() });
const exportSchema = z.object({ schemaVersion: z.literal(GRAPH_SCHEMA_VERSION), nodes: z.array(nodeSchema), edges: z.array(edgeSchema), groups: z.array(groupSchema) });

export type GraphExportDocument = z.infer<typeof exportSchema>;
export type GraphImportResult = { success: true; graph: GraphDocument } | { success: false; errors: readonly string[] };

export function exportGraph(graph: GraphDocument): string {
  return JSON.stringify({ schemaVersion: GRAPH_SCHEMA_VERSION, nodes: graph.nodes, edges: graph.edges, groups: graph.groups ?? [] }, null, 2);
}

export function importGraph(json: string): GraphImportResult {
  let value: unknown;
  try { value = JSON.parse(json); } catch { return { success: false, errors: ['Invalid JSON.'] }; }
  const parsed = exportSchema.safeParse(value);
  if (!parsed.success) return { success: false, errors: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`) };
  const graph = { nodes: parsed.data.nodes, edges: parsed.data.edges, groups: parsed.data.groups } as unknown as GraphDocument;
  const edgeIds = new Set<string>();
  const duplicateEdgeIds = parsed.data.edges.filter((edge) => { const duplicate = edgeIds.has(edge.id); edgeIds.add(edge.id); return duplicate; });
  const structural = validateGraphStructure(graph);
  const errors = [...structural.errors.map((error) => error.message), ...duplicateEdgeIds.map((edge) => `Edge id ${edge.id} must be unique.`)];
  return errors.length ? { success: false, errors } : { success: true, graph };
}
