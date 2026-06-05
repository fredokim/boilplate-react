export type PerformanceTiming = {
  name: string;
  durationMs: number;
  tags?: Record<string, string>;
};

export type PerformanceReporterAdapter = {
  timing: (event: PerformanceTiming) => void;
};

let adapter: PerformanceReporterAdapter = {
  timing: () => undefined,
};

export function setPerformanceReporterAdapter(nextAdapter: PerformanceReporterAdapter) {
  adapter = nextAdapter;
}

export const performanceReporter = {
  timing: (event: PerformanceTiming) => adapter.timing(event),
};
