import { getTranslations } from 'next-intl/server';
import { Alert } from '@/components/ui/alert';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState, Section } from '@/components/ui/page';
import { BalanceCard } from '@/components/creator/balance-card';
import { InstallPrompt } from '@/components/install-prompt';
import { WorkCard } from '@/components/creator/work-card';
import { requireCreator } from '@/lib/auth';
import { loadCreatorWork } from '@/lib/creator-data';
import { todayWib } from '@/lib/dates';
import { balance, latestByKind, timeline } from '@/lib/work';

export async function generateMetadata() {
  const tm = await getTranslations('nav');
  return { title: tm('home') };
}

export default async function Home() {
  const viewer = await requireCreator();
  const t = await getTranslations('home');
  const { parts, requests, submissions } = await loadCreatorWork(viewer);
  const { count: verified } = await viewer.supabase
    .from('social_accounts').select('id', { count: 'exact', head: true }).eq('creator_id', viewer.id).eq('status', 'verified');

  const bal = balance(parts, requests, todayWib());
  const nextTransfer = requests.find((r) => r.status === 'requested' || r.status === 'processing') ?? null;
  const active = parts.filter((p) => ['invited', 'applied', 'approved'].includes(p.status) && !(p.payout_request_id && requests.find((r) => r.id === p.payout_request_id)?.status === 'transferred'));
  const name = viewer.profile.full_name?.split(' ')[0] ?? '';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold leading-8">{t('greeting', { name })}</h1>
      <BalanceCard balance={bal} nextTransfer={nextTransfer} />
      {!verified && <Alert tone="warning">{t('socialPending')}</Alert>}
      <InstallPrompt installed={!!viewer.profile.app_installed_at} />

      <Section title={t('activeTitle')}>
        {active.length ? (
          <div className="space-y-3">
            {active.map((p) => {
              const latest = latestByKind(submissions.filter((s) => s.participation_id === p.id));
              const req = requests.find((r) => r.id === p.payout_request_id);
              return <WorkCard key={p.id} part={p} steps={timeline(p, p.jobs, latest, req)} />;
            })}
          </div>
        ) : (
          <EmptyState title={t('emptyActive')} body={t('emptyActiveBody')} action={<ButtonLink href="/job">{t('seeJobs')}</ButtonLink>} />
        )}
      </Section>
    </div>
  );
}
