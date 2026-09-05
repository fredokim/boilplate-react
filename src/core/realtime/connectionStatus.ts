/**
 * What a connection state means to the person looking at it.
 *
 * The status was rendered by printing the state itself, so the header read
 * "disconnected" or "reconnecting" — the names the code uses, offered to
 * someone who did not write it. That was tolerable while every disconnection
 * was a fault. It stopped being tolerable when the socket started releasing
 * itself on purpose: `disconnected` then covered both "this broke" and "we let
 * it go because nobody was watching", and the reader had no way to tell which.
 *
 * `suspended` is the state that separates them, and this table is what turns
 * any of them into a sentence.
 */
export type ConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'suspended'
  | 'disconnected'
  | 'error';

/**
 * `ok` — working as intended, including deliberately idle.
 * `busy` — working on it; nothing is required of the reader.
 * `bad` — something failed.
 *
 * Tone rather than a colour, because the same state is rendered as a dot in one
 * place and a sentence in another.
 */
export type ConnectionTone = 'ok' | 'busy' | 'bad';

export type ConnectionStatus = {
  /** Short enough for a badge. */
  label: string;
  /** One sentence, and only where there is something the reader should know. */
  detail?: string;
  tone: ConnectionTone;
};

const STATUS: Record<ConnectionState, ConnectionStatus> = {
  idle: { label: 'Not connected', tone: 'ok' },
  connecting: { label: 'Connecting', tone: 'busy' },
  connected: { label: 'Live', tone: 'ok' },
  reconnecting: {
    label: 'Reconnecting',
    detail: 'The connection dropped. Retrying with a growing delay.',
    tone: 'busy',
  },
  suspended: {
    label: 'Paused',
    // Says what to do about it, because the reader can fix this one and the
    // fix is not obvious: nothing is broken and no button restores it.
    detail: 'Released while the page was idle. It reconnects when you interact.',
    tone: 'ok',
  },
  disconnected: {
    label: 'Disconnected',
    detail: 'Not receiving updates.',
    tone: 'bad',
  },
  error: {
    label: 'Error',
    detail: 'The connection failed. Updates have stopped.',
    tone: 'bad',
  },
};

export function connectionStatus(state: ConnectionState): ConnectionStatus {
  return STATUS[state];
}
