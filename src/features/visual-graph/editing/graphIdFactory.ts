export interface GraphIdFactory {
  createNodeId(type: string): string;
  createEdgeId(): string;
  createGroupId(): string;
}

export const browserGraphIdFactory: GraphIdFactory = {
  createNodeId: (type) => `${type}-${crypto.randomUUID()}`,
  createEdgeId: () => `edge-${crypto.randomUUID()}`,
  createGroupId: () => `group-${crypto.randomUUID()}`,
};
