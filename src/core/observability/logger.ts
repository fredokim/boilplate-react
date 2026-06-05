type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogEvent = {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown> | undefined;
};

export type LoggerAdapter = {
  log: (event: LogEvent) => void;
};

let adapter: LoggerAdapter = {
  log: () => undefined,
};

export function setLoggerAdapter(nextAdapter: LoggerAdapter) {
  adapter = nextAdapter;
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => adapter.log({ level: 'debug', message, context }),
  info: (message: string, context?: Record<string, unknown>) => adapter.log({ level: 'info', message, context }),
  warn: (message: string, context?: Record<string, unknown>) => adapter.log({ level: 'warn', message, context }),
  error: (message: string, context?: Record<string, unknown>) => adapter.log({ level: 'error', message, context }),
};
