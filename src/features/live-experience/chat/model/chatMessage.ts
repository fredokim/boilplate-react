/**
 * A message as the page shows it.
 *
 * `id` and `sequence` do different jobs and neither substitutes for the other:
 * `id` names the message, so it is what duplicate suppression compares, and
 * `sequence` is the room's order, so it is what the transcript sorts on.
 *
 * `timestamp` is for the reader. The server allocates it at transaction start
 * while it allocates `sequence` under a row lock, so the two can disagree — this
 * type carries the order rather than asking a clock to stand in for it.
 *
 * The send attempt's own id (`clientMessageId`) is deliberately absent. It makes
 * a retry idempotent on the way out and means nothing on the way in.
 */
export type ChatMessage = {
  id: string;
  sequence: number;
  userId: string;
  displayName: string;
  profileImageUrl: string;
  message: string;
  timestamp: string;
};

