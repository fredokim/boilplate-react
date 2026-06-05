import { describe, expect, it } from 'vitest';
import { authApi } from '@features/auth/api/auth.api';
import { userApi } from '@features/user/api/user.api';
import { server } from '../../test/msw/server';
import { apiScenarios } from '../../test/msw/scenarios';
import { dummyUsers } from '../../test/fixtures/dummyData';

describe('apiClient', () => {
  it('parses login DTO response', async () => {
    const result = await authApi.login({ email: 'demo@example.com', password: 'password' });

    expect(result.accessToken).toBe('mock-access-token');
    expect(result.user.email).toBe('demo@example.com');
  });

  it('parses user list DTO response', async () => {
    const result = await userApi.list();

    expect(result.items).toHaveLength(dummyUsers.length);
    expect(result.items[0]?.email).toBe(dummyUsers[0]?.email);
  });

  it('throws frontend validation failure when API data breaks DTO contract', async () => {
    server.use(apiScenarios.usersInvalidDto);

    await expect(userApi.list()).rejects.toMatchObject({
      failure: {
        origin: 'frontend',
        kind: 'validation',
        message: 'API response did not match the frontend DTO contract.',
      },
    });
  });

  it('throws backend failure when API returns an error envelope', async () => {
    server.use(apiScenarios.usersBackendError);

    await expect(userApi.list()).rejects.toMatchObject({
      failure: {
        origin: 'backend',
        kind: 'server',
      },
    });
  });
});
