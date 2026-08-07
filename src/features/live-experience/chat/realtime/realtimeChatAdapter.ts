import type { ChatMessage } from '../model/chatMessage';

export type RealtimeConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

export type RealtimeChatHandlers = {
  onMessage: (message: ChatMessage) => void;
  onStateChange: (state: RealtimeConnectionState) => void;
};

export interface RealtimeChatAdapter {
  connect: (handlers: RealtimeChatHandlers) => () => void;
}

