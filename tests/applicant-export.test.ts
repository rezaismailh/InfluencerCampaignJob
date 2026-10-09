import { describe, expect, it } from 'vitest';
import { applicantSheet, exportFileName, type ExportLabels, type ExportRow } from '@/lib/applicant-export';
import { xlsx } from '@/lib/xlsx';
import type { Job, SocialAccount } from '@/lib/types';

const labels: ExportLabels = {
  gender: 'Gender', hijab: 'Hijab', accountType: 'Jenis akun', willingVisit: 'Bersedia visit', rateVisit: 'Rate visit', yes: 'Ya', no_: 'Tidak',
  genderName: (g) => g, hijabName: (h) => h, accountTypeName: (a) => a,
  no: 'No', id: 'ID', name: 'Nama', city: 'Kota', niche: 'Niche', persona: 'Persona', tier: 'Tier',
  username: (p) => `${p} username`, link: (p) => `${p} link`, followers: (p) => `${p} followers`, accountStatus: (p) => `${p} status`,
  fee: 'Rate', appliedAt: 'Daftar', status: 'Status', email: 'Email', whatsapp: 'WA', clientDecision: 'Keputusan', clientNote: 'Catatan',
  platform: (p) => p, tierName: (t) => t, verification: (s) => s, participation: (s) => s, nicheName: (k) => k, personaName: (k) => k,
};
const job = { job_type: 'non_visit', platforms: ['tiktok', 'instagram'], fee_type: 'open', fee: null, tier_fees: {}, tier_basis: 'largest', primary_platform: null } as unknown as Job;
const row = {
  id: 'abcdef12-0000-0000-0000-000000000000', creator_id: 'c1', status: 'applied', proposed_rate: 350000, agreed_fee: null,
  applied_at: '2026-10-08T10:00:00Z', profiles: { full_name: 'Rani', city: 'Bandung', email: 'rani@x.id', persona: 'genz', categories: ['food'], gender: 'female', hijab: 'hijab', account_type: 'personal', phone: '0812' },
} as unknown as ExportRow;
const accounts = [
  { creator_id: 'c1', platform: 'tiktok', username: 'rani', url: 'https://tiktok.com/@rani', followers: 12000, status: 'verified' },
  { creator_id: 'c1', platform: 'instagram', username: 'old', url: 'x', followers: 99, status: 'rejected' },
] as unknown as SocialAccount[];

describe('applicantSheet', () => {
  it('leaves contact details out of the client version', () => {
    const { header, body } = applicantSheet(job, [row], accounts, labels, false);
    expect(header).not.toContain('Email');
    expect(body[0]).not.toContain('rani@x.id');
    expect(body[0]).not.toContain('0812');
    expect(header.at(-2)).toBe('Keputusan');
    // TikTok block filled, rejected Instagram account left out, rate and tier from TikTok.
    expect(body[0].slice(6, 9)).toEqual(['female', 'hijab', 'personal']);
    expect(body[0][9]).toBe('micro');
    expect(body[0].slice(10, 14)).toEqual(['@rani', 'https://tiktok.com/@rani', 12000, 'verified']);
    expect(body[0].slice(14, 18)).toEqual([null, null, null, null]);
    expect(body[0][18]).toBe(350000);
    expect(header).not.toContain('Bersedia visit');
  });
  it('adds visit willingness and the visit rate for jobs with both modes', () => {
    const mixed = { ...job, job_type: 'both' } as Job;
    const { header, body } = applicantSheet(mixed, [{ ...row, visit_willing: true, proposed_rate_visit: 500000 } as ExportRow], accounts, labels, false);
    const at = (h: string) => body[0][header.indexOf(h)];
    expect(at('Bersedia visit')).toBe('Ya');
    expect(at('Rate')).toBe(350000);
    expect(at('Rate visit')).toBe(500000);
  });

  it('adds email and WhatsApp in the internal version', () => {
    const { header, body } = applicantSheet(job, [row], accounts, labels, true);
    expect(header).toContain('WA');
    expect(body[0]).toContain('0812');
  });
  it('names the file safely', () => {
    expect(exportFileName('Review Wafer: Coklat/Baru!', '2026-10-08', false)).toBe('pelamar-review-wafer-coklat-baru-2026-10-08.xlsx');
  });
});

describe('xlsx', () => {
  it('builds a zip with the sheet and escapes text', () => {
    const file = xlsx('Pelamar', ['A', 'B'], [['<b>&"x"', 5], ['=1+1', null]]);
    expect([...file.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const text = new TextDecoder().decode(file);
    expect(text).toContain('&lt;b&gt;&amp;&quot;x&quot;');
    expect(text).toContain('<t xml:space="preserve">=1+1</t>');
    expect(text).not.toContain('<f>');
  });
});
