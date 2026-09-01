import { chatMode } from '@core/config/dataMode';

/**
 * Whether chat comes from the mock transport or the real server. Decided in
 * `core/config/dataMode.ts`.
 */
export type ChatSourceMode = 'mock' | 'server';

export const chatSourceMode: ChatSourceMode = chatMode;

export const isServerBackedChat = chatSourceMode === 'server';
