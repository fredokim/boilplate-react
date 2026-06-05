import { describe, expect, it } from 'vitest';
import type { InferDto } from '@core/dto/inferDto';
import { parseState } from '@core/state/validateState';
import type { AuthUserDto } from '@features/auth/dto/Auth.dto';
import { authStateSnapshotSchema, authUserStateSchema, type AuthStateSnapshot } from './auth.schema';

describe('auth state schema', () => {
  it('parses state user typed from auth DTO contract', () => {
    const user: InferDto<typeof AuthUserDto> = parseState(
      authUserStateSchema,
      {
        id: 'u-1',
        email: 'demo@example.com',
        name: 'Demo Maker',
        permissions: ['dashboard:read'],
      },
      'auth.user.test',
    );

    expect(user.email).toBe('demo@example.com');
  });

  it('rejects invalid auth state snapshots', () => {
    expect(() =>
      parseState(
        authStateSnapshotSchema,
        {
          accessToken: '',
          status: 'authenticated',
          user: null,
        } satisfies Partial<AuthStateSnapshot>,
        'auth.snapshot.test',
      ),
    ).toThrow();
  });
});
