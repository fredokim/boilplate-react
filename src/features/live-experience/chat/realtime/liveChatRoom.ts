import { MockChatTransport, type MockChatOptions } from './mockChatTransport';

export const liveChatRoomId = 'summer-stage';

/**
 * One transport per page, so navigating away and back does not spawn a second stream.
 * Swap this for WebSocketChatTransport when a real endpoint exists.
 */
export const liveChatTransport = new MockChatTransport({ messagesPerSecond: 1 });

export function createLiveChatTransport(options: MockChatOptions = {}) {
  return new MockChatTransport(options);
}
