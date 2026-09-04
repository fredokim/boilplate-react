import { IsInt, IsNumber, IsObject, IsString } from 'class-validator';

/**
 * Validates the snapshot response at the same boundary as every other API call.
 *
 * `nodes` and `edges` are checked as objects only. Their entries are a map keyed
 * by an id the server chooses, which class-validator cannot express without a
 * wrapper class per key — and the runtime store already tolerates an unknown
 * entity, counting it in `diagnostics.unknownEntities` rather than throwing.
 */
export class TopologySnapshotDto {
  @IsString()
  topologyId = '';

  /** The sequence this snapshot reflects. The transport subscribes from here. */
  @IsInt()
  revision = 0;

  @IsNumber()
  capturedAt = 0;

  @IsObject()
  nodes: Record<string, unknown> = {};

  @IsObject()
  edges: Record<string, unknown> = {};
}
