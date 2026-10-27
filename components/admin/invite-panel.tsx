'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, Select } from '@/components/ui/field';
import { RupiahInput } from '@/components/ui/rupiah-input';
import { inviteCreators } from '@/app/admin/actions';
import type { FeeType, JobType } from '@/lib/types';

export type InviteJob = { id: string; title: string; job_type: JobType; fee_type: FeeType };
type Result = { id: string; error: string | null };

/** Invites one or more creators to a job; open-rate jobs need a fee, "both" jobs a work mode. */
export function InvitePanel({ jobs, creators, onDone, compact }: { jobs: InviteJob[]; creators: { id: string; name: string }[]; onDone?: () => void; compact?: boolean }) {
  const t = useTranslations('admin.creators');
  const te = useTranslations('errors');
  const tt = useTranslations('jobType');
  const [jobId, setJobId] = useState('');
  const [mode, setMode] = useState('');
  const [results, setResults] = useState<Result[] | null>(null);
  const [pending, startTransition] = useTransition();
  const job = jobs.find((j) => j.id === jobId);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fee = String(new FormData(e.currentTarget).get('fee') ?? '');
    startTransition(async () => {
      const res = await inviteCreators({ jobId, creatorIds: creators.map((c) => c.id), fee, mode });
      setResults(res);
      if (res.every((r) => !r.error)) onDone?.();
    });
  }

  if (!jobs.length) return <p className="text-[15px] text-teks-redup">{t('noOpenJobs')}</p>;
  const failed = results?.filter((r) => r.error) ?? [];
  const nameOf = (id: string) => creators.find((c) => c.id === id)?.name ?? id;

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-[13px] text-teks-redup">{t('inviteReviewHint')}</p>
      <div className={compact ? 'grid gap-3' : 'grid gap-3 md:grid-cols-3'}>
        <Field label={t('inviteJob')} htmlFor="invite-job">
          <Select id="invite-job" value={jobId} onChange={(e) => { setJobId(e.target.value); setResults(null); }} required>
            <option value="" disabled>{t('pickJob')}</option>
            {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
          </Select>
        </Field>
        {job?.job_type === 'both' && (
          <Field label={t('inviteMode')} htmlFor="invite-mode">
            <Select id="invite-mode" value={mode} onChange={(e) => setMode(e.target.value)} required>
              <option value="" disabled>{t('pickMode')}</option>
              <option value="non_visit">{tt('non_visit')}</option>
              <option value="visit">{tt('visit')}</option>
            </Select>
          </Field>
        )}
        {job && job.fee_type !== 'fixed' && (
          <Field label={t('inviteFee')} hint={job.fee_type === 'tier' ? t('inviteFeeTierHint') : t('inviteFeeOpenHint')} htmlFor="invite-fee">
            <RupiahInput id="invite-fee" name="fee" placeholder="250.000" required={job.fee_type === 'open'} />
          </Field>
        )}
      </div>
      <Button type="submit" disabled={pending || !jobId}>{pending ? t('inviting') : t('inviteCta', { count: creators.length })}</Button>
      {results && (
        <Alert tone={failed.length ? 'warning' : 'success'}>
          <p>{t('inviteResult', { ok: results.length - failed.length, total: results.length })}</p>
          {failed.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {failed.map((r) => <li key={r.id}>{nameOf(r.id)}: {te.has(r.error!) ? te(r.error!) : te('generic')}</li>)}
            </ul>
          )}
        </Alert>
      )}
    </form>
  );
}
