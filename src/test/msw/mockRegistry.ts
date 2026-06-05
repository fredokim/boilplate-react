import { apiScenarios } from './scenarios';

export type MockRegistryEntry = {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  endpoint: string;
  success: unknown;
  empty?: unknown;
  invalid?: unknown;
  error?: unknown;
  timeout?: unknown;
};

export const mockRegistry = [
  {
    method: 'POST',
    endpoint: '/api/auth/login',
    success: apiScenarios.authSuccess,
  },
  {
    method: 'GET',
    endpoint: '/api/auth/session',
    success: apiScenarios.sessionSuccess,
  },
  {
    method: 'GET',
    endpoint: '/api/users',
    success: apiScenarios.usersSuccess,
    empty: apiScenarios.usersEmpty,
    invalid: apiScenarios.usersInvalidDto,
    error: apiScenarios.usersBackendError,
    timeout: apiScenarios.usersTimeout,
  },
  {
    method: 'GET',
    endpoint: '/api/users/:id',
    success: apiScenarios.userById,
  },
  {
    method: 'GET',
    endpoint: '/api/dashboard/summary',
    success: apiScenarios.dashboardSummary,
  },
  {
    method: 'GET',
    endpoint: '/api/notifications',
    success: apiScenarios.notifications,
  },
  {
    method: 'GET',
    endpoint: '/api/audit-logs',
    success: apiScenarios.auditLogs,
  },
] satisfies MockRegistryEntry[];
