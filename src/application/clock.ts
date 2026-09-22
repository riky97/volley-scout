import type { Id, IsoDate, IsoTimestamp } from '@domain/index';

/** The only places in the app allowed to read the clock or generate ids. */

export function newId(): Id {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** ISO-8601 with the local timezone offset, so a report always shows the operator's time. */
export function nowIso(date: Date = new Date()): IsoTimestamp {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const pad = (value: number): string => String(Math.floor(Math.abs(value))).padStart(2, '0');
  const local = new Date(date.getTime() + offsetMinutes * 60_000).toISOString().slice(0, 23);
  return `${local}${sign}${pad(offsetMinutes / 60)}:${pad(offsetMinutes % 60)}`;
}

export function todayIsoDate(date: Date = new Date()): IsoDate {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
