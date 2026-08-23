export function measureOperation<T>(name: string, operation: () => T): { value: T; durationMs: number } {
  const start = performance.now(); const value = operation(); const durationMs = performance.now() - start;
  if (import.meta.env.DEV) performance.measure(name, { start, duration: durationMs });
  return { value, durationMs };
}
