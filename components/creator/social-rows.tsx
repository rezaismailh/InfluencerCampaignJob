'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, X } from 'lucide-react';
import { FieldError, useFormState } from '@/components/action-form';
import { Field, Input } from '@/components/ui/field';
import { cn } from '@/lib/cn';
import { PLATFORMS, profileFromInput, type Platform } from '@/lib/social';

type Row = { id: number; platform: Platform | ''; link: string; followers: string };

const PLACEHOLDER: Record<Platform, string> = {
  instagram: 'instagram.com/username atau @username',
  tiktok: 'tiktok.com/@username atau @username',
  youtube: 'youtube.com/@channel atau @channel',
  threads: 'threads.net/@username atau @username',
  x: 'x.com/username atau @username',
};

let nextId = 1;
const emptyRow = (): Row => ({ id: nextId++, platform: '', link: '', followers: '' });

/**
 * New social accounts, entered as part of the profile form: pick the platform,
 * paste a link or type the username, fill in followers. Fields are named
 * social_<field>_<index> so the server can point at the exact row.
 */
export function SocialRows({ startWithRow }: { startWithRow: boolean }) {
  const t = useTranslations('social');
  const tp = useTranslations('platform');
  const state = useFormState();
  const [rows, setRows] = useState<Row[]>(() => (startWithRow ? [emptyRow()] : []));
  // Clear the rows once the server has saved them (state changes only after a submit).
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.ok) setRows([]);
  }

  const update = (id: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-3">
      {rows.map((row, i) => {
        const check = row.platform && row.link.trim() ? profileFromInput(row.platform, row.link) : null;
        return (
          <fieldset key={row.id} className="space-y-3 rounded-2xl border border-garis bg-kertas p-4">
            <div className="flex items-center justify-between">
              <legend className="text-[15px] font-bold">{t('platform')}</legend>
              <button type="button" onClick={() => setRows((rs) => rs.filter((r) => r.id !== row.id))}
                className="-mr-2 inline-flex size-11 items-center justify-center rounded-full text-teks-redup hover:bg-latar" aria-label={t('removeRow')}>
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <input type="hidden" name={`social_platform_${i}`} value={row.platform} />
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('platform')}>
              {PLATFORMS.map((p) => (
                <button key={p} type="button" role="radio" aria-checked={row.platform === p} onClick={() => update(row.id, { platform: p })}
                  className={cn('inline-flex min-h-11 items-center rounded-full border px-4 text-[15px] font-medium',
                    row.platform === p ? 'border-nila-800 bg-nila-800 text-gading' : 'border-garis bg-kertas text-teks')}>
                  {tp(p)}
                </button>
              ))}
            </div>
            <FieldError name={`social_platform_${i}`} />

            <Field label={t('linkOrUsername')} htmlFor={`social_link_${i}`}>
              <Input id={`social_link_${i}`} name={`social_link_${i}`} inputMode="url" autoCapitalize="none" autoCorrect="off"
                placeholder={row.platform ? PLACEHOLDER[row.platform] : t('pickPlatformFirst')} disabled={!row.platform}
                value={row.link} onChange={(e) => update(row.id, { link: e.target.value })} />
              <FieldError name={`social_link_${i}`} />
              {check?.ok && <p className="text-[13px] text-sukses">{t('detected', { platform: tp(row.platform as Platform), username: check.username })}</p>}
              {check && !check.ok && check.error !== 'required' && <p className="text-[13px] text-peringatan">{t(`hint_${check.error}`)}</p>}
            </Field>

            <Field label={row.platform === 'youtube' ? t('subscribers') : t('followers')} hint={t('followersHint')} htmlFor={`social_followers_${i}`}>
              <Input id={`social_followers_${i}`} name={`social_followers_${i}`} inputMode="numeric" placeholder="12000" className="tabular"
                value={row.followers} onChange={(e) => update(row.id, { followers: e.target.value })} />
              <FieldError name={`social_followers_${i}`} />
            </Field>
          </fieldset>
        );
      })}
      <button type="button" onClick={() => setRows((rs) => [...rs, emptyRow()])}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 font-bold text-nila-800 hover:bg-nila-50">
        <Plus className="size-5" aria-hidden /> {t('addRow')}
      </button>
    </div>
  );
}
