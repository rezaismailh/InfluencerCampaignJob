'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Columns3, Download, Search, SlidersHorizontal, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/field';
import { verificationTone } from '@/components/status';
import {
  ALL_COLUMNS, COLUMN_GROUPS, EMPTY_FILTERS, PRESETS, cleanColumns, filterRows, sortRows,
  type ColumnKey, type CreatorRow, type Filters, type Sort,
} from '@/lib/creator-directory';
import { formatDate, todayWib } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import { PLATFORMS } from '@/lib/social';
import { TIERS } from '@/lib/tiers';
import { ACCOUNT_TYPES, GENDERS, HIJAB } from '@/lib/visit';
import { xlsx, type Cell } from '@/lib/xlsx';
import { cn } from '@/lib/cn';

const STORAGE_KEY = 'tali.admin.creatorColumns';
const PAGE = 50;
const NUMERIC: ColumnKey[] = ['maxFollowers', 'applied', 'approved', 'completed', 'paid'];

/** All registered creators: search, filters, sortable columns, a column picker with presets, and Excel export. */
export function CreatorTable({ rows, niches, canSeePaid }: { rows: CreatorRow[]; niches: string[]; canSeePaid: boolean }) {
  const t = useTranslations('admin.creators');
  const tp = useTranslations('platform');
  const ttier = useTranslations('tier');
  const tg = useTranslations('gender');
  const th = useTranslations('hijab');
  const ta = useTranslations('accountType');
  const tv = useTranslations('verification');
  const locale = useLocale();
  const allowed = useMemo(() => ALL_COLUMNS.filter((k) => k !== 'paid' || canSeePaid), [canSeePaid]);

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [sort, setSort] = useState<Sort>({ key: 'createdAt', dir: 'desc' });
  const [limit, setLimit] = useState(PAGE);
  const [columns, setColumns] = useState<ColumnKey[]>(() => cleanColumns(null, allowed));

  // The column choice is a per-browser convenience; the page works without it.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setColumns(cleanColumns(JSON.parse(saved), allowed));
    } catch { /* storage unavailable */ }
  }, [allowed]);
  function saveColumns(next: ColumnKey[]) {
    setColumns(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  }

  const provinces = useMemo(() => [...new Set(rows.map((r) => r.province).filter(Boolean))].sort(), [rows]);
  const shown = useMemo(() => sortRows(filterRows(rows, filters), sort), [rows, filters, sort]);
  const activeFilters = Object.entries(filters).filter(([k, v]) => k !== 'q' && v).length;
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => { setFilters((f) => ({ ...f, [key]: value })); setLimit(PAGE); };

  const count = (n: number) => n.toLocaleString('id-ID');
  const yesNo = (v: boolean) => (v ? t('yes') : t('no'));
  /** Plain value for export and title attributes. */
  const text = (r: CreatorRow, k: ColumnKey): Cell => {
    switch (k) {
      case 'gender': return r.gender ? tg(r.gender) : '';
      case 'hijab': return r.hijab ? th(r.hijab) : '';
      case 'accountType': return r.accountType ? ta(r.accountType) : '';
      case 'niches': return r.niches.join(', ');
      case 'accounts': return r.accounts.map((a) => `${tp(a.platform)} @${a.username} (${count(a.followers)})`).join('; ');
      case 'tier': return r.tier ? ttier(r.tier) : '';
      case 'verification': return r.verification === 'none' ? t('noAccount') : tv(r.verification);
      case 'createdAt': return r.createdAt.slice(0, 10);
      case 'onboarded': case 'installed': return yesNo(r[k]);
      case 'paid': return r.paid ?? '';
      default: return r[k] as Cell;
    }
  };
  const cell = (r: CreatorRow, k: ColumnKey) => {
    switch (k) {
      case 'name': return <span className="font-bold">{r.name || <span className="font-normal text-teks-redup">{r.email}</span>}</span>;
      case 'accounts':
        return (
          <ul className="space-y-0.5">
            {r.accounts.map((a) => (
              <li key={`${a.platform}${a.username}`} className={cn('whitespace-nowrap', a.status === 'rejected' && 'text-teks-redup line-through')}>
                <a href={a.url} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">{tp(a.platform)} @{a.username}</a>
                <span className="ml-1 text-teks-redup tabular">{count(a.followers)}</span>
              </li>
            ))}
          </ul>
        );
      case 'verification':
        return r.verification === 'none' ? <span className="text-teks-redup">{t('noAccount')}</span> : <Badge tone={verificationTone[r.verification]}>{tv(r.verification)}</Badge>;
      case 'maxFollowers': return <span className="tabular">{count(r.maxFollowers)}</span>;
      case 'paid': return <span className="tabular">{formatRupiah(r.paid ?? 0)}</span>;
      case 'applied': case 'approved': case 'completed': return <span className="tabular">{r[k]}</span>;
      case 'createdAt': return <span className="whitespace-nowrap">{formatDate(r.createdAt, locale)}</span>;
      case 'onboarded': case 'installed': return r[k] ? <Badge tone="success">{t('yes')}</Badge> : <span className="text-teks-redup">{t('no')}</span>;
      default: return text(r, k) || <span className="text-teks-redup">—</span>;
    }
  };

  function exportXlsx() {
    const file = xlsx(t('sheetName'), columns.map((k) => t(`col.${k}`)), shown.map((r) => columns.map((k) => text(r, k))));
    const url = URL.createObjectURL(new Blob([file as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `creator-${todayWib()}.xlsx` });
    a.click();
    URL.revokeObjectURL(url);
  }

  const option = (value: string, label: string) => <option key={value} value={value}>{label}</option>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-teks-redup" aria-hidden />
          <Input type="search" value={filters.q} onChange={(e) => set('q', e.target.value)} placeholder={t('search')} aria-label={t('search')} className="pl-10" />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
          <SlidersHorizontal className="size-4" aria-hidden /> {t('filters')}{activeFilters > 0 && ` (${activeFilters})`}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setShowColumns((v) => !v)} aria-expanded={showColumns}>
          <Columns3 className="size-4" aria-hidden /> {t('columns')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={exportXlsx} disabled={!shown.length}>
          <Download className="size-4" aria-hidden /> {t('export')}
        </Button>
      </div>

      {showFilters && (
        <div className="grid gap-2 rounded-2xl border border-garis bg-kertas p-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select aria-label={t('col.accounts')} value={filters.platform} onChange={(e) => set('platform', e.target.value as Filters['platform'])}>
            {option('', t('anyPlatform'))}{PLATFORMS.map((p) => option(p, tp(p)))}
          </Select>
          <Select aria-label={t('col.tier')} value={filters.tier} onChange={(e) => set('tier', e.target.value as Filters['tier'])}>
            {option('', t('anyTier'))}{TIERS.map((x) => option(x, ttier(x)))}
          </Select>
          <Select aria-label={t('col.gender')} value={filters.gender} onChange={(e) => set('gender', e.target.value as Filters['gender'])}>
            {option('', t('anyGender'))}{GENDERS.map((x) => option(x, tg(x)))}
          </Select>
          <Select aria-label={t('col.hijab')} value={filters.hijab} onChange={(e) => set('hijab', e.target.value as Filters['hijab'])}>
            {option('', t('anyHijab'))}{HIJAB.map((x) => option(x, th(x)))}
          </Select>
          <Select aria-label={t('col.accountType')} value={filters.accountType} onChange={(e) => set('accountType', e.target.value as Filters['accountType'])}>
            {option('', t('anyAccountType'))}{ACCOUNT_TYPES.map((x) => option(x, ta(x)))}
          </Select>
          <Select aria-label={t('col.niches')} value={filters.niche} onChange={(e) => set('niche', e.target.value)}>
            {option('', t('anyNiche'))}{niches.map((x) => option(x, x))}
          </Select>
          <Select aria-label={t('col.province')} value={filters.province} onChange={(e) => set('province', e.target.value)}>
            {option('', t('anyProvince'))}{provinces.map((x) => option(x, x))}
          </Select>
          <Select aria-label={t('col.verification')} value={filters.verification} onChange={(e) => set('verification', e.target.value as Filters['verification'])}>
            {option('', t('anyVerification'))}{(['verified', 'pending', 'rejected'] as const).map((x) => option(x, tv(x)))}{option('none', t('noAccount'))}
          </Select>
          <Select aria-label={t('col.onboarded')} value={filters.onboarded} onChange={(e) => set('onboarded', e.target.value as Filters['onboarded'])}>
            {option('', t('anyOnboarded'))}{option('yes', t('onboardedYes'))}{option('no', t('onboardedNo'))}
          </Select>
          <Select aria-label={t('col.approved')} value={filters.hasJob} onChange={(e) => set('hasJob', e.target.value as Filters['hasJob'])}>
            {option('', t('anyJob'))}{option('yes', t('hasJobYes'))}{option('no', t('hasJobNo'))}
          </Select>
          {activeFilters > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setFilters((f) => ({ ...EMPTY_FILTERS, q: f.q }))}>
              <X className="size-4" aria-hidden /> {t('clearFilters')}
            </Button>
          )}
        </div>
      )}

      {showColumns && (
        <div className="space-y-4 rounded-2xl border border-garis bg-kertas p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-bold text-teks-redup">{t('presets')}</span>
            {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((p) => (
              <Button key={p} type="button" variant="outline" size="sm" onClick={() => saveColumns(cleanColumns(PRESETS[p], allowed))}>{t(`preset.${p}`)}</Button>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_1.2fr]">
            {(Object.keys(COLUMN_GROUPS) as (keyof typeof COLUMN_GROUPS)[]).map((g) => (
              <fieldset key={g} className="space-y-1">
                <legend className="text-[13px] font-bold uppercase tracking-wide text-teks-redup">{t(`group.${g}`)}</legend>
                {(COLUMN_GROUPS[g] as readonly ColumnKey[]).filter((k) => allowed.includes(k)).map((k) => (
                  <label key={k} className="flex min-h-9 items-center gap-2 text-[15px]">
                    <input type="checkbox" className="size-4 accent-nila-800" checked={columns.includes(k)} disabled={k === 'name'}
                      onChange={(e) => saveColumns(e.target.checked ? [...columns, k] : columns.filter((c) => c !== k))} />
                    {t(`col.${k}`)}
                  </label>
                ))}
              </fieldset>
            ))}
            <div className="space-y-1">
              <p className="text-[13px] font-bold uppercase tracking-wide text-teks-redup">{t('order')}</p>
              <ol className="space-y-1">
                {columns.map((k, i) => (
                  <li key={k} className="flex items-center gap-1 rounded-lg bg-latar px-2 py-1 text-[15px]">
                    <span className="min-w-0 flex-1 truncate">{t(`col.${k}`)}</span>
                    <button type="button" className="rounded p-1 hover:bg-kertas disabled:opacity-30" disabled={i === 0} aria-label={t('moveUp')}
                      onClick={() => saveColumns(columns.map((c, j) => (j === i - 1 ? k : j === i ? columns[i - 1] : c)))}>
                      <ChevronUp className="size-4" aria-hidden />
                    </button>
                    <button type="button" className="rounded p-1 hover:bg-kertas disabled:opacity-30" disabled={i === columns.length - 1} aria-label={t('moveDown')}
                      onClick={() => saveColumns(columns.map((c, j) => (j === i + 1 ? k : j === i ? columns[i + 1] : c)))}>
                      <ChevronDown className="size-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      <p className="text-[13px] text-teks-redup">{t('showing', { shown: count(shown.length), total: count(rows.length) })}</p>

      <div className="overflow-x-auto rounded-2xl border border-garis bg-kertas">
        <table className="w-full min-w-max text-left text-[13px]">
          <thead className="bg-latar text-teks-redup">
            <tr>
              {columns.map((k, i) => {
                const active = sort.key === k;
                return (
                  <th key={k} scope="col" className={cn('px-3 py-2 font-bold', i === 0 && 'sticky left-0 z-[1] bg-latar', NUMERIC.includes(k) && 'text-right')}
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                    <button type="button" className="inline-flex items-center gap-1 hover:text-teks"
                      onClick={() => setSort((s) => ({ key: k, dir: s.key === k && s.dir === 'desc' ? 'asc' : 'desc' }))}>
                      {t(`col.${k}`)}
                      {active && (sort.dir === 'asc' ? <ArrowUp className="size-3.5" aria-hidden /> : <ArrowDown className="size-3.5" aria-hidden />)}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-garis">
            {shown.slice(0, limit).map((r) => (
              <tr key={r.id} className="align-top hover:bg-latar/60">
                {columns.map((k, i) => (
                  <td key={k} className={cn('px-3 py-2', i === 0 && 'sticky left-0 bg-kertas', NUMERIC.includes(k) && 'text-right')}>{cell(r, k)}</td>
                ))}
              </tr>
            ))}
            {!shown.length && (
              <tr><td colSpan={columns.length} className="px-3 py-8 text-center text-[15px] text-teks-redup">{t('empty')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {shown.length > limit && (
        <Button type="button" variant="outline" className="w-full" onClick={() => setLimit((l) => l + PAGE)}>
          {t('showMore', { count: Math.min(PAGE, shown.length - limit) })}
        </Button>
      )}
    </div>
  );
}
