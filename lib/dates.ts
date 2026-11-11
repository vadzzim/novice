// Календарные даты в формате YYYY-MM-DD. Часовой пояс демо — допущение, не факт о компании.
export const DEMO_TIME_ZONE = "Europe/Moscow";

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: DEMO_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Календарная дата отметки времени в часовом поясе демо. */
export function calendarDate(instant: Date): string {
  return formatter.format(instant);
}

function toUtcMs(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(isoDate: string, days: number): string {
  return new Date(toUtcMs(isoDate) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Разница календарных дат b - a в днях. */
export function diffDays(a: string, b: string): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / 86_400_000);
}

/** День работы: дата выхода — день 1. */
export function workDay(startDate: string, today: string): number {
  return diffDays(startDate, today) + 1;
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function formatRuDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}.${m}.${y}`;
}

export function formatRuDateTime(instant: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: DEMO_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(instant);
}
