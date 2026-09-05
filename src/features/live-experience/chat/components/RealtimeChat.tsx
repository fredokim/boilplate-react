import { connectionStatus } from '@core/realtime/connectionStatus';
import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ChatMessage } from '../model/chatMessage';
import type { ChatConnectionState, ChatDiagnostics } from '../realtime/types';
import { ChatProfileImage } from './ChatProfileImage';

type RealtimeChatProps = {
  connectionState: ChatConnectionState;
  messages: readonly ChatMessage[];
  diagnostics: ChatDiagnostics;
};

const timeFormatter = new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' });

/** Treat "within this many pixels of the bottom" as still pinned to live. */
const PIN_THRESHOLD_PX = 24;

/** Matches the .messages height in the stylesheet. */
const CHAT_VIEWPORT_HEIGHT_PX = 420;

export const RealtimeChat = memo(function RealtimeChat({ connectionState, diagnostics, messages }: RealtimeChatProps) {
  // The state names the code uses are not the words to show a reader.
  const status = connectionStatus(connectionState);

  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);
  const [pinned, setPinned] = useState(true);
  const pinnedRef = useRef(pinned);
  pinnedRef.current = pinned;

  const virtualizer = useVirtualizer({
    count: messages.length,
    estimateSize: () => 64,
    getItemKey: (index) => messages[index]?.id ?? index,
    getScrollElement: () => scrollElement,
    // jsdom reports no element size, and a real browser reports none until the first
    // measurement, so give the virtualiser the viewport height the stylesheet fixes.
    initialRect: { width: 320, height: CHAT_VIEWPORT_HEIGHT_PX },
    observeElementRect: (instance, callback) => {
      const element = instance.scrollElement;
      const measure = () =>
        callback({
          width: element && element.clientWidth > 0 ? element.clientWidth : 320,
          height: element && element.clientHeight > 0 ? element.clientHeight : CHAT_VIEWPORT_HEIGHT_PX,
        });
      measure();
      if (!element || typeof ResizeObserver === 'undefined') return () => undefined;
      const observer = new ResizeObserver(measure);
      observer.observe(element);
      return () => observer.disconnect();
    },
    overscan: 6,
  });

  // A bottom-anchored log only ever needs to go to the end, and setting scrollTop is
  // exact where scrollToIndex has to wait for dynamic rows to be measured.
  const scrollToLatest = () => {
    if (scrollElement) scrollElement.scrollTop = scrollElement.scrollHeight;
  };

  // Following the stream means staying at the bottom as messages land. Once the reader
  // scrolls up they are reading history, so new messages must not yank them back.
  useLayoutEffect(() => {
    if (pinnedRef.current && scrollElement) scrollElement.scrollTop = scrollElement.scrollHeight;
  }, [messages.length, scrollElement]);

  useEffect(() => {
    if (!scrollElement) return undefined;
    const onScroll = () => {
      const distanceFromBottom = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight;
      setPinned(distanceFromBottom <= PIN_THRESHOLD_PX);
    };
    scrollElement.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollElement.removeEventListener('scroll', onScroll);
  }, [scrollElement]);

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <section className="live-chat" aria-label="Realtime chat">
      <header className="live-chat__header">
        <div>
          <h2 className="m-0 text-lg font-bold text-ink">Live chat</h2>
          <p className="mb-0 mt-1 text-xs text-muted">Buffered, de-duplicated, and capped at {messages.length} shown</p>
        </div>
        <span
          className={`live-chat__status live-chat__status--${status.tone}`}
          role="status"
          title={status.detail}
        >
          {status.label}
        </span>
      </header>

      <div className="live-chat__viewport">
        <div className="live-chat__messages" aria-live="polite" ref={setScrollElement}>
          {messages.length === 0 ? (
            <p className="m-auto text-sm text-muted">Waiting for the first message…</p>
          ) : (
            <div className="live-chat__spacer" style={{ height: virtualizer.getTotalSize() }}>
              {virtualItems.map((virtualItem) => {
                const message = messages[virtualItem.index];
                if (!message) return null;
                return (
                  <article
                    className="live-chat__message"
                    data-index={virtualItem.index}
                    key={virtualItem.key}
                    ref={(element) => virtualizer.measureElement(element)}
                    style={{ transform: `translateY(${String(virtualItem.start)}px)` }}
                  >
                    <ChatProfileImage displayName={message.displayName} src={message.profileImageUrl} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <strong className="text-sm text-ink">{message.displayName}</strong>
                        <time className="text-[11px] text-muted" dateTime={message.timestamp}>
                          {timeFormatter.format(new Date(message.timestamp))}
                        </time>
                      </div>
                      <p className="mb-0 mt-1 break-words text-sm text-slate-700">{message.message}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {!pinned && messages.length > 0 ? (
          <button
            className="live-chat__jump"
            onClick={() => {
              setPinned(true);
              scrollToLatest();
            }}
            type="button"
          >
            Jump to latest
          </button>
        ) : null}
      </div>

      <footer className="live-chat__debug" aria-label="Chat debug information">
        <span>Shown: {messages.length}</span>
        <span>Rendered: {virtualItems.length}</span>
        <span>Dropped: {diagnostics.droppedByCapacity + diagnostics.droppedTooOld}</span>
        <span>Connection: {connectionState}</span>
      </footer>
    </section>
  );
});
