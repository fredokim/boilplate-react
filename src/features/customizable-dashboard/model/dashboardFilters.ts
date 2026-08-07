export type DashboardFilterValues = {
  dateFrom?: string;
  dateTo?: string;
  region?: string;
  product?: string;
};

export const emptyDashboardFilters: DashboardFilterValues = {};

export function mergeDashboardFilters(
  globalFilters: DashboardFilterValues,
  crossWidgetFilters: DashboardFilterValues,
  localFilters: DashboardFilterValues,
): DashboardFilterValues {
  return { ...globalFilters, ...crossWidgetFilters, ...localFilters };
}

export function removeEmptyFilters(filters: DashboardFilterValues): DashboardFilterValues {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));
}
