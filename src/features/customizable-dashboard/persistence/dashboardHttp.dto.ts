import { IsArray, IsInt, IsObject, IsString } from 'class-validator';

/**
 * Response DTOs for the server-backed dashboard endpoints.
 *
 * They go through `requestDto`, so every server response is validated at the
 * same boundary as every other API call in the app. `definition` and `presets`
 * are checked here only for their container type — the server validates their
 * structure with `dashboardSchema.ts` on both write and read, and duplicating
 * that shape here would give two definitions of it to keep in step.
 */

export class DashboardResponseDto {
  @IsString()
  id = '';

  @IsString()
  title = '';

  @IsString()
  ownerId = '';

  @IsString()
  visibility = 'private';

  @IsInt()
  schemaVersion = 1;

  /** The optimistic lock. Sent back on every write. */
  @IsInt()
  version = 1;

  @IsObject()
  definition: object = {};

  @IsString()
  updatedAt = '';
}

export class PersonalizationResponseDto {
  @IsString()
  dashboardId = '';

  @IsString()
  userId = '';

  @IsInt()
  schemaVersion = 1;

  @IsInt()
  version = 1;

  @IsString()
  activePresetId = '';

  @IsArray()
  presets: unknown[] = [];

  @IsString()
  updatedAt = '';
}
