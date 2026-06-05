import { analytics } from '@core/analytics/analytics';
import type { ComponentType } from 'react';
import { useEffect } from 'react';

export function withAnalytics<P extends object>(eventName: string, Component: ComponentType<P>) {
  return function AnalyticsWrappedComponent(props: P) {
    useEffect(() => {
      analytics.track({ name: eventName });
    }, []);

    return <Component {...props} />;
  };
}
