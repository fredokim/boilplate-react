import { analytics } from '@core/analytics/analytics';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function useRouteAnalytics() {
  const location = useLocation();

  useEffect(() => {
    analytics.page(`${location.pathname}${location.search}`);
  }, [location.pathname, location.search]);
}
