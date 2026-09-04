import { tokenStorage } from '@core/auth/tokenStorage';
import { ServerChatTransport, type ServerChatMessage } from './serverChatTransport';
import type { ChatMessage } from '../model/chatMessage';
import type { ChatConnectionState, ChatTransport, Unsubscribe } from './types';

/**
 * Presents `ServerChatTransport` as the `ChatTransport` the chat page consumes.
 *
 * Two shapes exist because they were built for different things. The page's
 * `ChatTransport` predates the backend and speaks in whole `ChatMessage`s;
 * `ServerChatTransport` speaks the wire protocol — stream events carrying
 * sequences and tombstones. Rather than widen one to fit the other, this maps
 * between them, which keeps the store, the controller, and every test written
 * against them untouched.
 *
 * Without this file `chatSourceMode` decided nothing: `liveChatRoom.ts`
 * constructed the mock transport unconditionally, so server mode still showed
 * generated messages — and the UI reported "Connected" while doing it.
 */

/**
 * The server has no avatar field, and inventing one per author would put a face
 * on a person the database never described. A single neutral placeholder says
 * "unknown" honestly.
 */
const DEFAULT_AVATAR = '/avatars/default.svg';

function toChatMessage(message: ServerChatMessage): ChatMessage {
  return {
    id: message.id,
    userId: message.authorId,
    displayName: message.displayName,
    profileImageUrl: DEFAULT_AVATAR,
    message: message.body,
    timestamp: message.sentAt,
  };
}

export class ServerBackedChatTransport implements ChatTransport {
  private readonly inner: ServerChatTransport;

  /**
   * The highest sequence seen, handed to the server on reconnect so it resumes
   * rather than replaying the room from the start. It only ever moves forward:
   * an out-of-order frame must not walk the resume point backwards and cause a
   * duplicate replay.
   */
  private lastSequence = 0;

  private readonly messageListeners = new Set<(message: ChatMessage) => void>();

  constructor(options: { getAccessToken?: () => string | null } = {}) {
    const getAccessToken = options.getAccessToken ?? (() => tokenStorage.getAccessToken());

    this.inner = new ServerChatTransport({
      getAccessToken,
      getLastSequence: () => this.lastSequence,
    });

    this.inner.subscribe((event) => {
      if (event.kind !== 'message') {
        // A tombstone has no place in a transcript the page models as append-only.
        // Tracking its sequence still matters: skipping it would make the next
        // reconnect ask for messages the server has already sent.
        this.lastSequence = Math.max(this.lastSequence, event.sequence);
        return;
      }

      this.lastSequence = Math.max(this.lastSequence, event.message.sequence);

      const message = toChatMessage(event.message);
      this.messageListeners.forEach((listener) => listener(message));
    });
  }

  connect(roomId: string): Promise<void> {
    return this.inner.connect(roomId);
  }

  disconnect(): void {
    this.inner.disconnect();
  }

  subscribe(listener: (message: ChatMessage) => void): Unsubscribe {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  /**
   * The page's state union is a superset of the transport's, so the values pass
   * through unchanged — there is no `idle` or `reconnecting` on the wire.
   */
  subscribeConnection(listener: (state: ChatConnectionState) => void): Unsubscribe {
    return this.inner.subscribeConnection(listener);
  }

  getConnectionState(): ChatConnectionState {
    return this.inner.getConnectionState();
  }
}
