import { describe, expect, it } from 'vitest';
import {
  addDays,
  createDateRange,
  diffInCalendarDays,
  formatDateOnly,
  formatRelativeTime,
  formatStableUtcDateTime,
  isSameDay,
  isValidDateInput,
  isWithinDateRange,
  parseDateOnly,
  toIsoString,
} from './date';

describe('date utilities', () => {
  it('parses and serializes stable date values', () => {
    expect(toIsoString(new Date('2026-05-31T10:20:30.000Z'))).toBe('2026-05-31T10:20:30.000Z');
    expect(formatDateOnly('2026-05-31T10:20:30.000Z')).toBe('2026-05-31');
    expect(parseDateOnly('2026-05-31').toISOString()).toBe('2026-05-31T00:00:00.000Z');
  });

  it('rejects invalid date values', () => {
    expect(isValidDateInput('not-a-date')).toBe(false);
    expect(() => toIsoString('not-a-date')).toThrow('Invalid date input.');
    expect(() => parseDateOnly('2026-02-31')).toThrow('Invalid date-only input.');
  });

  it('formats UTC output for hydration-safe text', () => {
    expect(formatStableUtcDateTime('2026-05-31T10:20:30.000Z')).toContain('2026');
  });

  it('calculates ranges and relative values', () => {
    const range = createDateRange('2026-05-01T12:00:00.000Z', '2026-05-03T12:00:00.000Z');

    expect(isWithinDateRange('2026-05-02T00:00:00.000Z', range)).toBe(true);
    expect(isSameDay('2026-05-02T01:00:00.000Z', '2026-05-02T10:00:00.000Z')).toBe(true);
    expect(diffInCalendarDays(addDays('2026-05-02T00:00:00.000Z', 2), '2026-05-02T00:00:00.000Z')).toBe(2);
    expect(formatRelativeTime('2026-05-03T00:00:00.000Z', '2026-05-02T00:00:00.000Z', 'en')).toBe('tomorrow');
  });
});
