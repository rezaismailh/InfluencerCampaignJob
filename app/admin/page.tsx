import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page';
import { canCurate, canFinance, requireStaff } from '@/lib/auth';
import { todayWib } from '@/lib/dates';

export async function generateMetadata() {
  const tm = await getTranslations('admin');
  return { title: tm('overview') };
}

export default async function Overview() {
  const viewer = await requireStaff();
  const t = await getTranslations('admin');
  const role = viewer.profile.role;
  const s = viewer.supabase;
  const tiles: { label: string; value: number; href: string; alert?: boolean }[] = [];

  if (canCurate(role)) {
    const [reviews, applicants, social] = await Promise.all([
      s.from('submissions').select('id', { count: 'exact', head: true }).in('status', ['pending_review', 'sent_to_brand']),
      s.from('participations').select('id', { count: 'exact', head: true }).eq('status', 'applied'),
      s.from('social_accounts').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);
    tiles.push(
      { label: t('pendingReviews'), value: reviews.count ?? 0, href: '/admin/review' },
      { label: t('pendingApplicants'), value: applicants.count ?? 0, href: '/admin/job' },
      { label: t('pendingSocial'), value: social.count ?? 0, href: '/admin/akun-sosial' },
    );
  }
  if (canFinance(role)) {
    const [open, overdue] = await Promise.all([
      s.from('payout_requests').select('id', { count: 'exact', head: true }).in('status', ['requested', 'processing']),
      s.from('payout_requests').select('id', { count: 'exact', head: true }).in('status', ['requested', 'processing']).lt('due_date', todayWib()),
    ]);
    tiles.push(
      { label: t('pendingPayouts'), value: open.count ?? 0, href: '/admin/pencairan' },
      { label: t('overdue'), value: overdue.count ?? 0, href: '/admin/pencairan', alert: (overdue.count ?? 0) > 0 },
    );
  }

  return (
    <div>
      <PageHeader title={t('overview')} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href}>
            <Card className={tile.alert ? 'border-bahaya' : 'hover:border-nila-300'}>
              <p className="text-[13px] text-teks-redup">{tile.label}</p>
              <p className={`text-[32px] font-extrabold leading-10 tabular ${tile.alert ? 'text-bahaya' : ''}`}>{tile.value}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
