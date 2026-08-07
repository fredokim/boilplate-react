import type { ChatMessage } from '../model/chatMessage';
import type { RealtimeConnectionState } from '../realtime/realtimeChatAdapter';
import { ChatProfileImage } from './ChatProfileImage';

type RealtimeChatProps = {
  connectionState: RealtimeConnectionState;
  messages: readonly ChatMessage[];
};

const timeFormatter = new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' });

export function RealtimeChat({ connectionState, messages }: RealtimeChatProps) {
  return (
    <section className="live-chat" aria-label="Realtime chat">
      <header className="live-chat__header">
        <div>
          <h2 className="m-0 text-lg font-bold text-ink">Live chat</h2>
          <p className="mb-0 mt-1 text-xs text-muted">Messages from the mock realtime adapter</p>
        </div>
        <span className={`live-chat__status live-chat__status--${connectionState}`}>{connectionState}</span>
      </header>
      <div className="live-chat__messages" aria-live="polite">
        {messages.length === 0 ? (
          <p className="m-auto text-sm text-muted">Waiting for the first message…</p>
        ) : (
          messages.map((message) => (
            <article className="live-chat__message" key={message.id}>
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
          ))
        )}
      </div>
      <footer className="live-chat__debug" aria-label="Chat debug information">
        <span>Messages: {messages.length}</span>
        <span>Connection: {connectionState}</span>
      </footer>
    </section>
  );
}

