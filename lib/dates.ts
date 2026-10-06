export const TIME_ZONE = 'Asia/Jakarta';

/** Today's date in WIB as YYYY-MM-DD. */
export function todayWib(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(now);
}

export function formatDate(value: string | Date, locale = 'id', withWeekday = false): string {
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00+07:00`)
    : new Date(value);
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'id-ID', {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withWeekday ? { weekday: 'long' } : {}),
  }).format(date);
}

export function formatDateTime(value: string | Date, locale = 'id'): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'id-ID', {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

/** Mirrors public.add_business_days: skips Saturday, Sunday and the given holidays. */
export function addBusinessDays(start: string, days: number, holidays: string[] = []): string {
  const skip = new Set(holidays);
  const d = new Date(`${start}T00:00:00Z`);
  let n = 0;
  while (n < days) {
    d.setUTCDate(d.getUTCDate() + 1);
    const iso = d.toISOString().slice(0, 10);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6 && !skip.has(iso)) n += 1;
  }
  return d.toISOString().slice(0, 10);
}

export function isOnOrBefore(date: string | null | undefined, today: string): boolean {
  return !!date && date <= today;
}
