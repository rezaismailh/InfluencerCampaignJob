'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { updateFollowers } from '@/app/(creator)/actions';
import { Input } from '@/components/ui/field';

// Inline follower update. Plain buttons, not a nested form: the account list sits inside the profile form.
export function SocialFollowersEdit({ id, followers }: { id: string; followers: number }) {
  const t = useTranslations('social');
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(followers));
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  const save = () => start(async () => {
    const res = await updateFollowers(id, value);
    setError(!res.ok);
    if (res.ok) setEditing(false);
  });

  if (!editing) {
    return (
      <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-teks-redup tabular">
        {t('followersCount', { count: followers.toLocaleString('id-ID') })}
        <button type="button" onClick={() => setEditing(true)} className="inline-flex min-h-11 items-center font-bold text-nila-800 underline underline-offset-4">
          {t('updateFollowers')}
        </button>
      </p>
    );
  }
  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Input aria-label={t('followers')} inputMode="numeric" className="tabular" value={value} autoFocus
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } }} />
        <button type="button" onClick={save} disabled={pending}
          className="min-h-11 shrink-0 rounded-[14px] bg-nila-800 px-4 text-[15px] font-bold text-gading disabled:opacity-50">
          {t('saveFollowers')}
        </button>
      </div>
      {error && <p className="text-[13px] text-bahaya">{t('followersInvalid')}</p>}
      <p className="text-[13px] text-teks-redup">{t('followersRecheck')}</p>
    </div>
  );
}
