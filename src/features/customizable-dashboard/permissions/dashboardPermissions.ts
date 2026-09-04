export type DashboardRole = 'viewer' | 'editor' | 'owner';
export type DashboardAction =
  | 'view'
  | 'filter'
  | 'refresh'
  | 'edit'
  | 'save'
  | 'import'
  | 'export'
  | 'settings';

const permissionsByRole: Record<DashboardRole, ReadonlySet<DashboardAction>> = {
  viewer: new Set(['view', 'filter', 'refresh']),
  editor: new Set(['view', 'filter', 'refresh', 'edit', 'save']),
  owner: new Set(['view', 'filter', 'refresh', 'edit', 'save', 'import', 'export', 'settings']),
};

export type DashboardActionGate = {
  role: DashboardRole;
  can: (action: DashboardAction) => boolean;
  execute: <T>(action: DashboardAction, operation: () => T) => T | undefined;
};

export function createDashboardActionGate(role: DashboardRole): DashboardActionGate {
  const can = (action: DashboardAction) => permissionsByRole[role].has(action);
  return {
    role,
    can,
    execute: (action, operation) => can(action) ? operation() : undefined,
  };
}
