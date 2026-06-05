export type DateInput = Date | number | string;

export type DateFormatOptions = {
  locale?: string;
  timeZone?: string;
};

export type DateRange = {
  start: Date;
  end: Date;
};

const dayInMs = 24 * 60 * 60 * 1000;

export function toDate(input: DateInput): Date {
  const date = input instanceof Date ? new Date(input.getTime()) : new Date(input);

  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date input.');
  }

  return date;
}

export function isValidDateInput(input: unknown): input is DateInput {
  if (!(input instanceof Date) && typeof input !== 'number' && typeof input !== 'string') {
    return false;
  }

  return !Number.isNaN(new Date(input).getTime());
}

export function toIsoString(input: DateInput): string {
  return toDate(input).toISOString();
}

export function parseDateOnly(input: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);

  if (!match) {
    throw new Error('Date-only input must be YYYY-MM-DD.');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error('Invalid date-only input.');
  }

  return date;
}

export function formatDateOnly(input: DateInput): string {
  return toIsoString(input).slice(0, 10);
}

export function formatDate(input: DateInput, options: DateFormatOptions = {}): string {
  return new Intl.DateTimeFormat(options.locale, {
    dateStyle: 'medium',
    ...(options.timeZone ? { timeZone: options.timeZone } : {}),
  }).format(toDate(input));
}

export function formatTime(input: DateInput, options: DateFormatOptions = {}): string {
  return new Intl.DateTimeFormat(options.locale, {
    timeStyle: 'short',
    ...(options.timeZone ? { timeZone: options.timeZone } : {}),
  }).format(toDate(input));
}

export function formatDateTime(input: DateInput, options: DateFormatOptions = {}): string {
  return new Intl.DateTimeFormat(options.locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...(options.timeZone ? { timeZone: options.timeZone } : {}),
  }).format(toDate(input));
}

export function formatStableUtcDateTime(input: DateInput): string {
  return formatDateTime(input, { locale: 'en-CA', timeZone: 'UTC' });
}

export function addDays(input: DateInput, days: number): Date {
  const date = toDate(input);
  date.setDate(date.getDate() + days);
  return date;
}

export function startOfDay(input: DateInput): Date {
  const date = toDate(input);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfDay(input: DateInput): Date {
  const date = toDate(input);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function diffInCalendarDays(left: DateInput, right: DateInput): number {
  return Math.round((startOfDay(left).getTime() - startOfDay(right).getTime()) / dayInMs);
}

export function isSameDay(left: DateInput, right: DateInput): boolean {
  return diffInCalendarDays(left, right) === 0;
}

export function createDateRange(start: DateInput, end: DateInput): DateRange {
  const range = { start: startOfDay(start), end: endOfDay(end) };

  if (range.start.getTime() > range.end.getTime()) {
    throw new Error('Date range start must be before end.');
  }

  return range;
}

export function isWithinDateRange(input: DateInput, range: DateRange): boolean {
  const time = toDate(input).getTime();
  return time >= range.start.getTime() && time <= range.end.getTime();
}

export function formatRelativeTime(input: DateInput, base: DateInput = new Date(), locale?: string): string {
  const diffMs = toDate(input).getTime() - toDate(base).getTime();
  const absMs = Math.abs(diffMs);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (absMs < 60_000) {
    return formatter.format(Math.round(diffMs / 1000), 'second');
  }

  if (absMs < 3_600_000) {
    return formatter.format(Math.round(diffMs / 60_000), 'minute');
  }

  if (absMs < dayInMs) {
    return formatter.format(Math.round(diffMs / 3_600_000), 'hour');
  }

  return formatter.format(Math.round(diffMs / dayInMs), 'day');
}
