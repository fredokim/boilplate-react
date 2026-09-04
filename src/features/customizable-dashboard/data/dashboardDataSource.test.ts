import { createDataSource, dashboardDataSourceQueryKey } from './dashboardDataSource';

describe('dashboard data source query key', () => {
  it('creates the same key for the same source and parameters regardless of parameter insertion order', () => {
    const first = createDataSource('sales-summary');
    first.parameters = { scope: 'month', region: 'kr' };
    const second = createDataSource('sales-summary');
    second.parameters = { region: 'kr', scope: 'month' };

    expect(dashboardDataSourceQueryKey(first)).toEqual(dashboardDataSourceQueryKey(second));
  });

  it('changes the key when the source or parameters change', () => {
    const baseline = createDataSource('sales-summary');
    const differentSource = createDataSource('active-users');
    const differentParameters = createDataSource('sales-summary');
    differentParameters.parameters = { scope: 'week' };

    expect(dashboardDataSourceQueryKey(differentSource)).not.toEqual(dashboardDataSourceQueryKey(baseline));
    expect(dashboardDataSourceQueryKey(differentParameters)).not.toEqual(dashboardDataSourceQueryKey(baseline));
  });
});
