import { creatorTier, type Tier } from './tiers';
import type { Cell } from './xlsx';
import type { Job, Participation, Profile, SocialAccount } from './types';
import type { Platform } from './social';

export type ExportRow = Participation & {
  profiles: Pick<Profile, 'full_name' | 'city' | 'email' | 'persona' | 'categories'> & { phone?: string | null };
};

export type ExportLabels = {
  no: string; id: string; name: string; city: string; niche: string; persona: string; tier: string;
  username: (p: string) => string; link: (p: string) => string; followers: (p: string) => string; accountStatus: (p: string) => string;
  fee: string; appliedAt: string; status: string; email: string; whatsapp: string; clientDecision: string; clientNote: string;
  platform: (p: Platform) => string; tierName: (t: Tier) => string; verification: (s: SocialAccount['status']) => string;
  participation: (s: Participation['status']) => string; nicheName: (k: string) => string; personaName: (k: string) => string;
};

/**
 * One row per creator for the client to curate: profile, an account block per job platform,
 * fee or proposed rate, and empty decision/note columns. Contact details only when `internal`.
 */
export function applicantSheet(job: Job, rows: ExportRow[], accounts: SocialAccount[], l: ExportLabels, internal: boolean) {
  const header = [l.no, l.id, l.name, l.city, l.niche, l.persona, l.tier,
    ...job.platforms.flatMap((p) => [l.username(l.platform(p)), l.link(l.platform(p)), l.followers(l.platform(p)), l.accountStatus(l.platform(p))]),
    l.fee, l.appliedAt, l.status, ...(internal ? [l.email, l.whatsapp] : []), l.clientDecision, l.clientNote];
  const widths = [5, 10, 24, 18, 22, 16, 18, ...job.platforms.flatMap(() => [18, 36, 12, 16]), 14, 14, 18, ...(internal ? [26, 18] : []), 18, 30];

  const body: Cell[][] = rows.map((r, i) => {
    const accs = accounts.filter((a) => a.creator_id === r.creator_id && a.status !== 'rejected');
    const tier = creatorTier(job, accs);
    const fee = job.fee_type === 'fixed' ? job.fee
      : job.fee_type === 'tier' ? (r.agreed_fee ?? (tier ? job.tier_fees[tier] : null))
      : (r.agreed_fee ?? r.proposed_rate);
    const perPlatform = job.platforms.flatMap((p) => {
      const a = accs.filter((x) => x.platform === p).sort((x, y) => y.followers - x.followers)[0];
      return a ? [`@${a.username}`, a.url, a.followers, l.verification(a.status)] : [null, null, null, null];
    });
    return [
      i + 1, r.id.slice(0, 8), r.profiles.full_name ?? '', r.profiles.city ?? '',
      r.profiles.categories.map(l.nicheName).join(', '), r.profiles.persona ? l.personaName(r.profiles.persona) : '',
      tier ? l.tierName(tier) : '', ...perPlatform,
      fee ?? null, r.applied_at.slice(0, 10), l.participation(r.status),
      ...(internal ? [r.profiles.email ?? '', r.profiles.phone ?? ''] : []), '', '',
    ];
  });
  return { header, body, widths };
}

export function exportFileName(title: string, today: string, internal: boolean): string {
  const slug = title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'job';
  return `${internal ? 'internal-' : ''}pelamar-${slug}-${today}.xlsx`;
}
