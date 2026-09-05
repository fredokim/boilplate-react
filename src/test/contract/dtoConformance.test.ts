import 'reflect-metadata';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getMetadataStorage } from 'class-validator';
import { ApiErrorDto } from '@core/api/ApiEnvelope.dto';
import { AuthUserDto, LoginRequestDto, LoginResultDto, SessionDto } from '@features/auth/dto/Auth.dto';
import {
  KpiDataDto,
  SeriesDataDto,
  SeriesPointDto,
  TableColumnDto,
  TableDataDto,
  TableRowDto,
} from '@features/customizable-dashboard/data/dashboardDataSource.dto';
import {
  DashboardResponseDto,
  PersonalizationResponseDto,
} from '@features/customizable-dashboard/persistence/dashboardHttp.dto';
import { ChatHistoryDto, ChatMessageResponseDto } from '@features/live-experience/chat/realtime/serverChat.dto';
import { UserDto, UserListDto, UserListItemDto } from '@features/user/dto/User.dto';
import { TopologySnapshotDto } from '@features/visual-graph/realtime/topologySnapshot.dto';

/**
 * Every DTO this app validates a server response with, against the schema the
 * server publishes for it.
 *
 * The neighbouring `openapiContract.test.ts` asserts *meaning* — that the field
 * an optimistic lock depends on is present, that the chat message carries what
 * the store orders by. Those are worth writing by hand and there is no way to
 * derive them. What it could not do is keep up: it named eight shapes out of
 * nineteen, and the server publishes forty-five schemas. A field quietly
 * becoming optional in one of the other eleven would have reached a reader as a
 * runtime validation failure, which is the frontend blaming itself for the
 * server's change.
 *
 * This reads what class-validator actually enforces rather than what a type
 * says, because that is what decides whether a response is accepted at runtime.
 */

const SPEC_PATH = resolve(__dirname, '../../../contracts/openapi.json');

type Schema = { properties?: Record<string, unknown>; required?: string[] };
type OpenApiDocument = { components: { schemas: Record<string, Schema> } };

function loadSpec(): OpenApiDocument | null {
  if (!existsSync(SPEC_PATH)) return null;

  return JSON.parse(readFileSync(SPEC_PATH, 'utf8')) as OpenApiDocument;
}

const spec = loadSpec();

/** See openapiContract.test.ts: the server package is a sibling, not a dependency. */
const describeIfSpec = spec ? describe : describe.skip;

type Constructor = new () => object;

/**
 * The declared correspondence. A DTO absent from here is a DTO nothing compares
 * to the server, so the coverage test below fails until it is either mapped or
 * declared as not coming from this API.
 */
const MAPPED: readonly (readonly [Constructor, string])[] = [
  [AuthUserDto, 'AuthUserResponseDto'],
  [SessionDto, 'SessionResponseDto'],
  [LoginResultDto, 'LoginResponseDto'],
  [LoginRequestDto, 'LoginRequestDto'],
  [KpiDataDto, 'KpiDataDto'],
  [SeriesPointDto, 'SeriesPointDto'],
  [SeriesDataDto, 'SeriesDataDto'],
  [TableColumnDto, 'TableColumnDto'],
  [TableRowDto, 'TableRowDto'],
  [TableDataDto, 'TableDataDto'],
  [DashboardResponseDto, 'DashboardResponseDto'],
  [PersonalizationResponseDto, 'PersonalizationResponseDto'],
  [ChatMessageResponseDto, 'ChatMessageDto'],
  [ChatHistoryDto, 'ChatHistoryDto'],
  [UserDto, 'UserResponseDto'],
  [UserListItemDto, 'UserResponseDto'],
  [UserListDto, 'UserListResponseDto'],
  [TopologySnapshotDto, 'TopologySnapshotDto'],
];

/**
 * Validated locally rather than received from this API.
 *
 * `ApiErrorDto` describes the `error` object *inside* the envelope, which the
 * server publishes as an inline object on `ApiErrorEnvelope` rather than as a
 * named schema. `openapiContract.test.ts` checks that envelope directly.
 */
const NOT_A_RESPONSE_SCHEMA: readonly Constructor[] = [ApiErrorDto];

/** Property names class-validator will enforce on this class. */
function validatedProperties(target: Constructor): Set<string> {
  const metadata = getMetadataStorage().getTargetValidationMetadatas(target, '', false, false);

  return new Set(metadata.map((entry) => entry.propertyName));
}

/**
 * Properties this class accepts as absent.
 *
 * `@IsOptional()` registers as `conditionalValidation`; anything without one is
 * enforced, and a response missing it is rejected before a component sees it.
 */
function optionalProperties(target: Constructor): Set<string> {
  const metadata = getMetadataStorage().getTargetValidationMetadatas(target, '', false, false);

  return new Set(
    metadata.filter((entry) => entry.type === 'conditionalValidation').map((entry) => entry.propertyName),
  );
}

describeIfSpec('every mapped DTO matches the schema the server publishes', () => {
  const schemas = spec?.components.schemas ?? {};

  for (const [Dto, schemaName] of MAPPED) {
    describe(`${Dto.name} ↔ ${schemaName}`, () => {
      it('is a schema the server actually publishes', () => {
        expect(Object.keys(schemas)).toContain(schemaName);
      });

      it('validates no field the server does not send', () => {
        const published = new Set(Object.keys(schemas[schemaName]?.properties ?? {}));
        const invented = [...validatedProperties(Dto)].filter((name) => !published.has(name));

        expect(invented).toEqual([]);
      });

      /**
       * The dangerous direction. A field the server may omit but the DTO
       * enforces turns a legitimate response into a validation failure, and the
       * reader is told the page cannot read the answer.
       */
      it('does not require a field the server treats as optional', () => {
        const schema = schemas[schemaName];
        const required = new Set(schema?.required ?? []);
        const optional = optionalProperties(Dto);
        const overRequired = [...validatedProperties(Dto)].filter(
          (name) => !optional.has(name) && !required.has(name),
        );

        expect(overRequired).toEqual([]);
      });

      /**
       * The quiet direction. A field the server guarantees but the DTO treats as
       * optional pushes an impossible `undefined` into every component that
       * reads it, and nothing fails until one of them does.
       */
      it('does not treat a guaranteed field as optional', () => {
        const schema = schemas[schemaName];
        const validated = validatedProperties(Dto);
        const underRequired = (schema?.required ?? []).filter(
          (name) => validated.has(name) && optionalProperties(Dto).has(name),
        );

        expect(underRequired).toEqual([]);
      });
    });
  }
});

describeIfSpec('coverage', () => {
  /**
   * The ratchet. Adding a DTO without deciding what it corresponds to is how
   * eight of nineteen came to be checked in the first place.
   */
  it('maps or excuses every DTO class in the repository', () => {
    const declared = new Set<string>([
      ...MAPPED.map(([Dto]) => Dto.name),
      ...NOT_A_RESPONSE_SCHEMA.map((Dto) => Dto.name),
    ]);

    const exported = [
      ApiErrorDto,
      AuthUserDto,
      SessionDto,
      LoginResultDto,
      LoginRequestDto,
      KpiDataDto,
      SeriesPointDto,
      SeriesDataDto,
      TableColumnDto,
      TableRowDto,
      TableDataDto,
      DashboardResponseDto,
      PersonalizationResponseDto,
      ChatMessageResponseDto,
      ChatHistoryDto,
      UserDto,
      UserListItemDto,
      UserListDto,
      TopologySnapshotDto,
    ].map((Dto) => Dto.name);

    expect(exported.filter((name) => !declared.has(name))).toEqual([]);
  });
});
