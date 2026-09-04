import { isServerBackedChat } from './chatSourceMode';
import { MockChatTransport, type MockChatOptions } from './mockChatTransport';
import { ServerBackedChatTransport } from './serverChatRoomTransport';
import type { ChatTransport } from './types';

/**
 * The broadcast the demo page joins.
 *
 * In server mode this must name a row in the `Broadcast` table — the seed
 * creates one with exactly this id, so a freshly seeded database has something
 * to join. Mock mode ignores it beyond using it as a room key.
 */
export const liveChatRoomId = 'summer-stage';

/**
 * One transport per page, so navigating away and back does not spawn a second stream.
 *
 * Which one is `chatSourceMode`'s decision. It was not, until now: this module
 * constructed the mock unconditionally, so `VITE_DATA_MODE=server` left chat on
 * generated messages while the page displayed "Connected".
 */
export const liveChatTransport: ChatTransport = isServerBackedChat
  ? new ServerBackedChatTransport()
  : new MockChatTransport({ messagesPerSecond: 1 });

/**
 * A dedicated mock transport, for tests and Storybook that need to script the
 * stream. Deliberately not mode-aware: a story asking for a mock wants a mock.
 */
export function createLiveChatTransport(options: MockChatOptions = {}) {
  return new MockChatTransport(options);
}
