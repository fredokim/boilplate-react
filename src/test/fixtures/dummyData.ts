export type DummyUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  status: 'active' | 'invited' | 'blocked';
  team: string;
  lastLoginAt: string;
};

export type DummyNotification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export type DummyAuditLog = {
  id: string;
  actor: string;
  action: string;
  target: string;
  createdAt: string;
};

export const dummyUsers: DummyUser[] = [
  {
    id: 'u-1',
    email: 'demo@example.com',
    name: 'Demo Maker',
    role: 'admin',
    permissions: ['dashboard:read', 'user:read', 'user:write', 'settings:read'],
    status: 'active',
    team: 'Platform',
    lastLoginAt: '2026-05-31T09:30:00.000Z',
  },
  {
    id: 'u-2',
    email: 'designer@example.com',
    name: 'Design Partner',
    role: 'designer',
    permissions: ['dashboard:read', 'user:read'],
    status: 'active',
    team: 'Design System',
    lastLoginAt: '2026-05-30T14:10:00.000Z',
  },
  {
    id: 'u-3',
    email: 'viewer@example.com',
    name: 'Read Only User',
    role: 'viewer',
    permissions: ['dashboard:read'],
    status: 'invited',
    team: 'Operations',
    lastLoginAt: '2026-05-21T02:15:00.000Z',
  },
  {
    id: 'u-4',
    email: 'blocked@example.com',
    name: 'Blocked User',
    role: 'viewer',
    permissions: [],
    status: 'blocked',
    team: 'External',
    lastLoginAt: '2026-04-18T11:00:00.000Z',
  },
];

export const dummySession = {
  user: dummyUsers[0],
};

export const dummyDashboardSummary = {
  activeUsers: dummyUsers.filter((user) => user.status === 'active').length,
  invitedUsers: dummyUsers.filter((user) => user.status === 'invited').length,
  blockedUsers: dummyUsers.filter((user) => user.status === 'blocked').length,
  apiLatencyMs: 128,
  contractErrorRate: 0.2,
};

export const dummyNotifications: DummyNotification[] = [
  {
    id: 'noti-1',
    title: 'DTO validation passed',
    message: 'User list response matched the expected contract.',
    read: false,
    createdAt: '2026-05-31T10:00:00.000Z',
  },
  {
    id: 'noti-2',
    title: 'Storybook updated',
    message: 'Atomic UI stories were rebuilt with the latest controls.',
    read: true,
    createdAt: '2026-05-30T08:20:00.000Z',
  },
];

export const dummyAuditLogs: DummyAuditLog[] = [
  {
    id: 'audit-1',
    actor: 'Demo Maker',
    action: 'created',
    target: 'Design System Boilerplate',
    createdAt: '2026-05-29T04:12:00.000Z',
  },
  {
    id: 'audit-2',
    actor: 'Design Partner',
    action: 'reviewed',
    target: 'Button stories',
    createdAt: '2026-05-30T15:45:00.000Z',
  },
];

export const createApiSuccess = <TData>(data: TData) => ({
  success: true,
  data,
});

export const createApiError = (code: string, message: string) => ({
  success: false,
  error: {
    code,
    message,
  },
});
