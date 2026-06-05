import { delay, http, HttpResponse } from 'msw';
import {
  createApiError,
  createApiSuccess,
  dummyAuditLogs,
  dummyDashboardSummary,
  dummyNotifications,
  dummySession,
  dummyUsers,
} from '../fixtures/dummyData';

export const apiScenarios = {
  authSuccess: http.post('/api/auth/login', () =>
    HttpResponse.json(
      createApiSuccess({
        accessToken: 'mock-access-token',
        user: dummySession.user,
      }),
    ),
  ),
  sessionSuccess: http.get('/api/auth/session', () => HttpResponse.json(createApiSuccess(dummySession))),
  usersSuccess: http.get('/api/users', () =>
    HttpResponse.json(
      createApiSuccess({
        items: dummyUsers,
      }),
    ),
  ),
  usersEmpty: http.get('/api/users', () =>
    HttpResponse.json(
      createApiSuccess({
        items: [],
      }),
    ),
  ),
  usersInvalidDto: http.get('/api/users', () =>
    HttpResponse.json({
      success: true,
      data: {
        items: [{ id: 1, email: 'broken', name: null, role: 'admin' }],
      },
    }),
  ),
  usersBackendError: http.get('/api/users', () =>
    HttpResponse.json(createApiError('USERS_UNAVAILABLE', 'Users are unavailable.'), { status: 503 }),
  ),
  usersTimeout: http.get('/api/users', async () => {
    await delay(2_000);

    return HttpResponse.json(
      createApiSuccess({
        items: dummyUsers,
      }),
    );
  }),
  userById: http.get('/api/users/:id', ({ params }) => {
    const id = String(params.id);
    const user = dummyUsers.find((item) => item.id === id);

    if (!user) {
      return HttpResponse.json(createApiError('USER_NOT_FOUND', 'User not found.'), { status: 404 });
    }

    return HttpResponse.json(createApiSuccess(user));
  }),
  dashboardSummary: http.get('/api/dashboard/summary', () => HttpResponse.json(createApiSuccess(dummyDashboardSummary))),
  notifications: http.get('/api/notifications', () =>
    HttpResponse.json(
      createApiSuccess({
        items: dummyNotifications,
      }),
    ),
  ),
  auditLogs: http.get('/api/audit-logs', () =>
    HttpResponse.json(
      createApiSuccess({
        items: dummyAuditLogs,
      }),
    ),
  ),
  health: http.get('/api/health', () =>
    HttpResponse.json(
      createApiSuccess({
        status: 'ok',
      }),
    ),
  ),
};

export const defaultHandlers = [
  apiScenarios.authSuccess,
  apiScenarios.sessionSuccess,
  apiScenarios.usersSuccess,
  apiScenarios.userById,
  apiScenarios.dashboardSummary,
  apiScenarios.notifications,
  apiScenarios.auditLogs,
  apiScenarios.health,
];
