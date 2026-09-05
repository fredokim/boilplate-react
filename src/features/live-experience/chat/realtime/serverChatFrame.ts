import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ChatMessageResponseDto } from './serverChat.dto';
import type { ServerChatMessage } from './serverChatTransport';

/**
 * What arrived on the socket, once it has been checked.
 *
 * Every HTTP response in this app is validated against a DTO before a component
 * sees it, and there is a whole failure vocabulary for a server that answers in
 * a shape the page cannot read. The socket carried the same domain objects and
 * was trusted: `parsed as { type?: string; message?: ServerChatMessage }`, and
 * whatever came through went into the store.
 *
 * `ChatMessageResponseDto` already describes this exact object for the history
 * endpoint. Reusing it here is the point — one description, both paths, so the
 * two cannot drift into disagreeing about the same message.
 */
export type ParsedChatFrame =
  | { kind: 'message'; message: ServerChatMessage }
  | { kind: 'deleted'; messageId: string; sequence: number }
  | { kind: 'error' }
  /**
   * Dropped. A frame this client does not understand is not a reason to tear
   * down a working stream — a server that has learned a new frame type is ahead,
   * not broken — and a malformed one is not a reason to trust it either.
   */
  | { kind: 'ignored'; reason: 'not-json' | 'not-an-object' | 'unknown-type' | 'invalid-payload' };

const IGNORED = (reason: Extract<ParsedChatFrame, { kind: 'ignored' }>['reason']): ParsedChatFrame => ({
  kind: 'ignored',
  reason,
});

/**
 * Synchronous on purpose.
 *
 * `validate()` returns a promise, and awaiting one per frame would let two
 * frames finish out of the order they arrived in. Ordering is the one thing the
 * store cannot repair on its own.
 */
function validateMessage(payload: unknown): ServerChatMessage | null {
  if (typeof payload !== 'object' || payload === null) return null;

  const instance = plainToInstance(ChatMessageResponseDto, payload);

  if (validateSync(instance, { forbidUnknownValues: true, whitelist: true }).length > 0) return null;

  /**
   * The instance, not the payload it was built from.
   *
   * The first version validated the instance and then handed on the raw object,
   * so a message missing `body` passed — the DTO's initialiser supplied the
   * default to the throwaway copy — and the store received an object without the
   * field its own type promises. Whatever is checked is what should be used.
   */
  return instance;
}

export function parseServerChatFrame(raw: unknown): ParsedChatFrame {
  if (typeof raw !== 'string') return IGNORED('not-json');

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return IGNORED('not-json');
  }

  if (typeof parsed !== 'object' || parsed === null) return IGNORED('not-an-object');

  const frame = parsed as { type?: unknown; message?: unknown; messageId?: unknown; sequence?: unknown };

  if (frame.type === 'message') {
    const message = validateMessage(frame.message);

    return message ? { kind: 'message', message } : IGNORED('invalid-payload');
  }

  /**
   * A tombstone rather than a silent removal: clients that already received the
   * message need to be told to drop it, and that is what makes them converge
   * without refetching history.
   *
   * `sequence` is required rather than defaulted. It used to fall back to 0,
   * which is not a missing value but the earliest possible one — a tombstone
   * that sorts ahead of every message in the room.
   */
  if (frame.type === 'deleted') {
    const validId = typeof frame.messageId === 'string' && frame.messageId !== '';
    const validSequence = typeof frame.sequence === 'number' && Number.isInteger(frame.sequence);

    return validId && validSequence
      ? { kind: 'deleted', messageId: frame.messageId as string, sequence: frame.sequence as number }
      : IGNORED('invalid-payload');
  }

  if (frame.type === 'error') return { kind: 'error' };

  // `ready`, `joined`, `pong` and `heartbeat` are understood and carry nothing
  // this transport acts on. They are not failures, and neither is a frame type
  // this client has never heard of.
  return IGNORED('unknown-type');
}
