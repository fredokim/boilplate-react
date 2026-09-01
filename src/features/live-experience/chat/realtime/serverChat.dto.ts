import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';

/**
 * Validates chat responses at the same boundary as every other API call.
 *
 * The message shape is declared in full rather than as an open object: the store
 * orders on `sequence` and dedupes on `id`, so a response missing either would
 * fail somewhere far from here.
 */
export class ChatMessageResponseDto {
  @IsString() id = '';
  @IsString() clientMessageId = '';
  @IsString() broadcastId = '';
  @IsInt() sequence = 0;
  @IsString() authorId = '';
  @IsString() displayName = '';

  /** Empty for a deleted message. The server retains the row for audit. */
  @IsString() body = '';

  /** Server clock. The client's own timestamp is neither sent nor trusted. */
  @IsString() sentAt = '';

  @IsBoolean() deleted = false;
}

export class ChatHistoryDto {
  @ValidateNested({ each: true })
  @Type(() => ChatMessageResponseDto)
  @IsArray()
  messages: ChatMessageResponseDto[] = [];

  /** Null once the page reached the end, so a client knows to stop paging. */
  @IsOptional()
  @IsInt()
  nextCursor: number | null = null;

  @IsInt() latestSequence = 0;
}
