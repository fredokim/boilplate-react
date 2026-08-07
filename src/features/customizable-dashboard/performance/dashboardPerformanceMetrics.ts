import { useSyncExternalStore } from 'react';

let dashboardRenderCount = 0;
const widgetRenderCounts = new Map<string, number>();
let notificationPending = false;
const listeners = new Set<() => void>();

export function recordDashboardRender() {
  dashboardRenderCount += 1;
  scheduleNotification();
}

export function recordWidgetRender(widgetId: string) {
  widgetRenderCounts.set(widgetId, (widgetRenderCounts.get(widgetId) ?? 0) + 1);
  scheduleNotification();
}

function scheduleNotification() {
  if (notificationPending) return;
  notificationPending = true;
  queueMicrotask(() => {
    notificationPending = false;
    listeners.forEach((listener) => listener());
  });
}

export function useDashboardRenderCount() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => dashboardRenderCount,
    () => dashboardRenderCount,
  );
}

export function useWidgetRenderCount(widgetId: string | null) {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => widgetId ? (widgetRenderCounts.get(widgetId) ?? 0) : 0,
    () => 0,
  );
}
