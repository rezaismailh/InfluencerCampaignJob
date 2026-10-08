import { getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { verificationTone } from '@/components/status';
import { SocialFollowersEdit } from '@/components/creator/social-followers-edit';
import { SocialRemoveButton } from '@/components/creator/social-remove-button';
import type { SocialAccount } from '@/lib/types';

export async function SocialList({ accounts }: { accounts: SocialAccount[] }) {
  const t = await getTranslations('social');
  const tp = await getTranslations('platform');
  const tv = await getTranslations('verification');
  if (!accounts.length) return null;
  return (
    <ul className="space-y-2">
      {accounts.map((a) => (
        <li key={a.id} className="flex items-start justify-between gap-3 rounded-2xl border border-garis bg-kertas p-3">
          <div className="min-w-0 space-y-1">
            <p className="font-bold">{tp(a.platform)} · <a href={a.url} target="_blank" rel="noreferrer" className="underline decoration-garis underline-offset-4">@{a.username}</a></p>
            <SocialFollowersEdit id={a.id} followers={a.followers} />
            <Badge tone={verificationTone[a.status]}>{tv(a.status)}</Badge>
            {a.status === 'rejected' && a.reject_reason && <p className="text-[13px] text-bahaya">{t('rejectedReason', { reason: a.reject_reason })}</p>}
          </div>
          <SocialRemoveButton id={a.id} label={t('remove')} />
        </li>
      ))}
    </ul>
  );
}
