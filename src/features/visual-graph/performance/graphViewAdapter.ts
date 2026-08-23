import type { GraphRoute } from '../model/graph';

export type GraphRouteLookup = { nodeIds: ReadonlySet<string>; edgeIds: ReadonlySet<string> };
export const createRouteLookup = (route: GraphRoute | null): GraphRouteLookup => ({ nodeIds: new Set(route?.nodeIds ?? []), edgeIds: new Set(route?.edgeIds ?? []) });
export type GraphDetailLevel = 'compact' | 'standard' | 'detailed';
export const getGraphDetailLevel = (zoom: number): GraphDetailLevel => zoom < 0.65 ? 'compact' : zoom > 1.2 ? 'detailed' : 'standard';
