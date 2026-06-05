export type ErrorReport = {
  error: unknown;
  context?: Record<string, unknown>;
};

export type ErrorReporterAdapter = {
  capture: (report: ErrorReport) => void;
};

let adapter: ErrorReporterAdapter = {
  capture: () => undefined,
};

export function setErrorReporterAdapter(nextAdapter: ErrorReporterAdapter) {
  adapter = nextAdapter;
}

export const errorReporter = {
  capture: (report: ErrorReport) => adapter.capture(report),
};
