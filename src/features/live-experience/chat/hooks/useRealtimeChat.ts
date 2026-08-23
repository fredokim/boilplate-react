import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ChatController } from '../realtime/chatController';
import { ChatStore, type ChatStoreOptions } from '../realtime/chatStore';
import type { ChatConnectionState, ChatTransport } from '../realtime/types';

type UseRealtimeChatOptions = {
  roomId: string;
  transport: ChatTransport;
  store?: ChatStoreOptions;
};

export function useRealtimeChat({ roomId, store: storeOptions, transport }: UseRealtimeChatOptions) {
  const store = useMemo(() => new ChatStore(storeOptions), [storeOptions]);
  const controller = useMemo(
    () => new ChatController({ roomId, transport, store }),
    [roomId, store, transport],
  );

  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [connectionState, setConnectionState] = useState<ChatConnectionState>(transport.getConnectionState());

  useEffect(() => {
    void controller.start();
    const unsubscribe = transport.subscribeConnection(setConnectionState);
    return () => {
      unsubscribe();
      controller.stop();
    };
  }, [controller, transport]);

  useEffect(() => {
    const onVisibility = () => controller.setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [controller]);

  return {
    connectionState,
    messages: snapshot.messages,
    diagnostics: snapshot.diagnostics,
  };
}
