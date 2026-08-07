import { useEffect, useState } from 'react';
import type { ChatMessage } from '../model/chatMessage';
import type { RealtimeChatAdapter, RealtimeConnectionState } from '../realtime/realtimeChatAdapter';

export function useRealtimeChat(adapter: RealtimeChatAdapter) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>('idle');

  useEffect(() => {
    const disconnect = adapter.connect({
      onMessage: (message) => setMessages((currentMessages) => [...currentMessages, message]),
      onStateChange: setConnectionState,
    });

    return disconnect;
  }, [adapter]);

  return { connectionState, messages };
}

