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

/** "14 Okt" — for dates close enough that the year is obvious. */
export function formatDayMonth(value: string, locale = 'id'): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'id-ID', { timeZone: TIME_ZONE, day: 'numeric', month: 'short' })
    .format(new Date(`${value}T00:00:00+07:00`)).replace(' ', '\u00a0');
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

function ymd(y: number, m: number, d: number): string {
  return new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
}

/** Mirrors public.ready_date for monthly terms: on/before the cut-off -> pay day that month, else next month. */
export function monthlyReadyDate(ref: string, payDay: number, cutoffDay: number): string {
  const [y, m, d] = ref.split('-').map(Number);
  const pay = ymd(y, m - 1 + (d <= cutoffDay ? 0 : 1), payDay);
  if (pay >= ref) return pay;
  const [py, pm] = pay.split('-').map(Number);
  return ymd(py, pm, payDay);
}

/** The next cut-off from today and the payout dates on either side of it, for the job page. */
export function monthlyPaymentExample(today: string, payDay: number, cutoffDay: number) {
  const [y, m, d] = today.split('-').map(Number);
  const cutoff = ymd(y, m - 1 + (d <= cutoffDay ? 0 : 1), cutoffDay);
  const [cy, cm, cd] = cutoff.split('-').map(Number);
  return {
    cutoff,
    before: monthlyReadyDate(cutoff, payDay, cutoffDay),
    after: monthlyReadyDate(ymd(cy, cm - 1, cd + 1), payDay, cutoffDay),
  };
}
