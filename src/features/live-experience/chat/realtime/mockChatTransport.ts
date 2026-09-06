import type { ChatMessage } from '../model/chatMessage';
import type { ChatConnectionState, ChatTransport, Unsubscribe } from './types';

const participants = [
  { userId: 'user-mina', displayName: 'Mina', profileImageUrl: '/avatars/mina.svg' },
  { userId: 'user-jun', displayName: 'Jun', profileImageUrl: '/avatars/jun.svg' },
  { userId: 'user-alex', displayName: 'Alex', profileImageUrl: '/avatars/alex.svg' },
] as const;

const lines = [
  'The stage looks amazing!',
  'That guitar tone is incredible.',
  'Watching from Seoul 👋',
  'This is my favorite song.',
  'The crowd energy is unreal!',
] as const;

export type MockChatOptions = {
  /** 0 disables the generator so a test can emit by hand. */
  messagesPerSecond?: number;
  /** Milliseconds before connect resolves, so the connecting state is observable. */
  handshakeMs?: number;
  /** Drops the connection once, so reconnect can be exercised. */
  disconnectAfterMs?: number;
  /** Replayed on every connect. */
  initialMessages?: readonly ChatMessage[];
};

export class MockChatTransport implements ChatTransport {
  private state: ChatConnectionState = 'idle';
  private readonly messageListeners = new Set<(message: ChatMessage) => void>();
  private readonly connectionListeners = new Set<(state: ChatConnectionState) => void>();
  private generatorTimer: ReturnType<typeof setInterval> | null = null;
  private handshakeTimer: ReturnType<typeof setTimeout> | null = null;
  private dropTimer: ReturnType<typeof setTimeout> | null = null;
  private counter = 0;

  constructor(private readonly options: MockChatOptions = {}) {}

  connect(): Promise<void> {
    this.setState(this.state === 'idle' ? 'connecting' : 'reconnecting');
    return new Promise((resolve) => {
      this.handshakeTimer = setTimeout(() => {
        this.handshakeTimer = null;
        this.setState('connected');
        for (const message of this.options.initialMessages ?? []) this.emit(message);
        this.startGenerator();
        if (this.options.disconnectAfterMs && !this.dropTimer) {
          this.dropTimer = setTimeout(() => {
            this.dropTimer = null;
            this.simulateDrop();
          }, this.options.disconnectAfterMs);
        }
        resolve();
      }, this.options.handshakeMs ?? 350);
    });
  }

  disconnect() {
    this.stopGenerator();
    if (this.handshakeTimer) clearTimeout(this.handshakeTimer);
    if (this.dropTimer) clearTimeout(this.dropTimer);
    this.handshakeTimer = null;
    this.dropTimer = null;
    this.setState('disconnected');
  }

  simulateDrop() {
    this.stopGenerator();
    this.setState('disconnected');
  }

  emit(message: ChatMessage) {
    if (this.state !== 'connected') return;
    this.messageListeners.forEach((listener) => listener(message));
  }

  createMessage(index = this.counter++): ChatMessage {
    const participant = participants[index % participants.length] ?? participants[0];
    const line = lines[index % lines.length] ?? lines[0];
    return {
      id: `mock-${String(index)}`,
      sequence: index + 1,
      userId: participant.userId,
      displayName: participant.displayName,
      profileImageUrl: participant.profileImageUrl,
      message: line,
      // The real clock. This used to be `Date.now() + index`, faking a rising
      // timestamp because the timestamp was the order — which is exactly the
      // conflation `sequence` exists to avoid.
      timestamp: new Date().toISOString(),
    };
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

  private startGenerator() {
    this.stopGenerator();
    const perSecond = this.options.messagesPerSecond ?? 1;
    if (!perSecond) return;
    const tickMs = 100;
    let carry = 0;
    this.generatorTimer = setInterval(() => {
      carry += (perSecond * tickMs) / 1000;
      while (carry >= 1) {
        this.emit(this.createMessage());
        carry -= 1;
      }
    }, tickMs);
  }

  private stopGenerator() {
    if (this.generatorTimer) clearInterval(this.generatorTimer);
    this.generatorTimer = null;
  }

  private setState(state: ChatConnectionState) {
    this.state = state;
    this.connectionListeners.forEach((listener) => listener(state));
  }
}
