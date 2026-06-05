export type AnalyticsEvent = {
  name: string;
  properties?: Record<string, string | number | boolean | null>;
};

export type AnalyticsAdapter = {
  track: (event: AnalyticsEvent) => void;
  page: (path: string) => void;
  timing: (name: string, durationMs: number) => void;
};

const noopAdapter: AnalyticsAdapter = {
  track: () => undefined,
  page: () => undefined,
  timing: () => undefined,
};

let adapter: AnalyticsAdapter = noopAdapter;

export function setAnalyticsAdapter(nextAdapter: AnalyticsAdapter) {
  adapter = nextAdapter;
}

export const analytics: AnalyticsAdapter = {
  track: (event) => adapter.track(event),
  page: (path) => adapter.page(path),
  timing: (name, durationMs) => adapter.timing(name, durationMs),
};
