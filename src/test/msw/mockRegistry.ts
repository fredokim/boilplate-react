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
    endpoint: '/api/dashboard/kpi',
    success: apiScenarios.dashboardKpi,
    empty: apiScenarios.dashboardKpiEmpty,
    error: apiScenarios.dashboardDataError[0],
    timeout: apiScenarios.dashboardDataDelayed[0],
  },
  {
    method: 'GET',
    endpoint: '/api/dashboard/chart',
    success: apiScenarios.dashboardChart,
    empty: apiScenarios.dashboardChartEmpty,
    error: apiScenarios.dashboardDataError[1],
    timeout: apiScenarios.dashboardDataDelayed[1],
  },
  {
    method: 'GET',
    endpoint: '/api/dashboard/table',
    success: apiScenarios.dashboardTable,
    empty: apiScenarios.dashboardTableEmpty,
    error: apiScenarios.dashboardDataError[2],
    timeout: apiScenarios.dashboardDataDelayed[2],
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
