import type { ChatMessage } from '../model/chatMessage';
import type { ChatConnectionState, ChatTransport, Unsubscribe } from './types';

type WebSocketLike = Pick<WebSocket, 'addEventListener' | 'close'>;

/**
 * The production transport. It only moves bytes: ordering, duplicates, retention, and
 * batching are the store's job, so a flaky socket cannot corrupt the transcript.
 */
export class WebSocketChatTransport implements ChatTransport {
  private socket: WebSocketLike | null = null;
  private state: ChatConnectionState = 'idle';
  private readonly messageListeners = new Set<(message: ChatMessage) => void>();
  private readonly connectionListeners = new Set<(state: ChatConnectionState) => void>();

  constructor(
    private readonly createSocket: (roomId: string) => WebSocketLike,
    private readonly parseMessage: (data: unknown) => ChatMessage = (data) => JSON.parse(String(data)) as ChatMessage,
  ) {}

  connect(roomId: string): Promise<void> {
    this.disconnect();
    this.setState('connecting');
    return new Promise((resolve, reject) => {
      const socket = this.createSocket(roomId);
      this.socket = socket;
      socket.addEventListener('open', () => {
        this.setState('connected');
        resolve();
      });
      socket.addEventListener('message', (event) => {
        try {
          this.messageListeners.forEach((listener) => listener(this.parseMessage('data' in event ? event.data : event)));
        } catch {
          // A single malformed frame must not tear down a working stream.
          this.setState('error');
        }
      });
      socket.addEventListener('close', () => this.setState('disconnected'));
      socket.addEventListener('error', () => {
        this.setState('error');
        reject(new Error('Chat transport connection failed'));
      });
    });
  }

  disconnect() {
    this.socket?.close();
    this.socket = null;
    this.setState('disconnected');
  }

  subscribe(listener: (message: ChatMessage) => void): Unsubscribe {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  subscribeConnection(listener: (state: ChatConnectionState) => void): Unsubscribe {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }

  getConnectionState() {
    return this.state;
  }

  private setState(state: ChatConnectionState) {
    if (state === this.state) return;
    this.state = state;
    this.connectionListeners.forEach((listener) => listener(state));
  }
}
