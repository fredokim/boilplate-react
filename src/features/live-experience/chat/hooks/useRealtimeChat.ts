import { watchForIdle } from '@core/realtime/idleSuspension';
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
  // The controller, not the transport. The transport reports only what its
  // socket did, so it can never say `suspended` (the controller decides that)
  // or `reconnecting` (which exists only between a drop and the next attempt).
  // Reading it here is what made an idle release show up as a failure.
  const [connectionState, setConnectionState] = useState<ChatConnectionState>(controller.getConnectionState());

  useEffect(() => {
    void controller.start();
    const unsubscribe = controller.subscribeConnection(setConnectionState);
    return () => {
      unsubscribe();
      controller.stop();
    };
  }, [controller]);

  useEffect(() => {
    const onVisibility = () => controller.setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [controller]);

  /**
   * Hands the socket back when nobody is watching.
   *
   * `suspend()` and `resume()` rather than stop and start: stop already
   * disconnects and blocks the reconnect backoff, but lands on `disconnected` --
   * the state that means a fault. Suspending says which happened; resuming
   * rejoins from the last applied sequence. An abandoned tab therefore stops
   * costing anything, and a returning reader catches up rather than reloading.
   */
  useEffect(() => {
    return watchForIdle({
      onIdle: () => controller.suspend(),
      onResume: () => void controller.resume(),
    });
  }, [controller]);

  return {
    connectionState,
    messages: snapshot.messages,
    diagnostics: snapshot.diagnostics,
  };
}
