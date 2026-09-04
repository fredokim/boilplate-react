import { topologyMode } from '@core/config/dataMode';

/**
 * Whether topology runtime comes from the scripted mock transport or the real
 * WebSocket. Decided in `core/config/dataMode.ts`.
 */
export type RealtimeSourceMode = 'mock' | 'server';

export const realtimeSourceMode: RealtimeSourceMode = topologyMode;

export const isServerBackedTopology = realtimeSourceMode === 'server';
