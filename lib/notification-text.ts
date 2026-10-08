import { formatDate } from './dates';
import { formatRupiah } from './money';

type Translate = (key: string, values?: Record<string, string | number>) => string;

const MONEY = ['amount', 'fee'];
const DATES = ['date', 'ready_at'];
const COUNTS = ['old', 'new'];

/**
 * Turns a stored notification (kind + params) into a sentence.
 * `t` is scoped to "notifications"; `tKind`/`tPlatform` translate enum values.
 */
export function notificationText(
  n: { kind: string; params: Record<string, unknown> },
  t: Translate,
  tKind: (k: string) => string,
  tPlatform: (k: string) => string,
  locale = 'id',
): string {
  const values: Record<string, string | number> = {};
  for (const [key, raw] of Object.entries(n.params ?? {})) {
    if (raw === null || raw === undefined) {
      values[key] = '';
    } else if (MONEY.includes(key) && typeof raw === 'number') {
      values[key] = formatRupiah(raw);
    } else if (COUNTS.includes(key) && typeof raw === 'number') {
      values[key] = raw.toLocaleString('id-ID');
    } else if (DATES.includes(key) && typeof raw === 'string') {
      values[key] = formatDate(raw, locale);
    } else if (key === 'at' && typeof raw === 'string') {
      values[key] = formatDate(raw, locale, true);
    } else if (key === 'kind' && typeof raw === 'string') {
      values[key] = tKind(raw);
    } else if (key === 'platform' && typeof raw === 'string') {
      values[key] = tPlatform(raw);
    } else {
      values[key] = String(raw);
    }
  }
  try {
    return t(n.kind, values).replace(/\s+/g, ' ').trim();
  } catch {
    return n.kind;
  }
}
