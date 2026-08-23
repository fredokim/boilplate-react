import type { ChatMessage } from '../model/chatMessage';

export type ChatConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

export type Unsubscribe = () => void;

export type ChatDiagnostics = {
  received: number;
  applied: number;
  duplicatesIgnored: number;
  outOfOrderRepositioned: number;
  droppedTooOld: number;
  droppedByCapacity: number;
  flushCount: number;
  totalBatchSize: number;
  pendingSize: number;
  reconnectCount: number;
  lastMessageAt: number | null;
};

export type ChatStoreSnapshot = {
  /** Newest last. Bounded by the store's retention limit. */
  messages: readonly ChatMessage[];
  diagnostics: ChatDiagnostics;
  version: number;
};

export interface ChatTransport {
  connect(roomId: string): Promise<void>;
  disconnect(): void;
  subscribe(listener: (message: ChatMessage) => void): Unsubscribe;
  subscribeConnection(listener: (state: ChatConnectionState) => void): Unsubscribe;
  getConnectionState(): ChatConnectionState;
}
