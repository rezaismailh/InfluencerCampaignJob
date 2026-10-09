import type { Job, Participation, PayoutRequest, Submission, SubmissionKind } from './types';
import { workMode } from './visit';

export type Latest = Partial<Record<SubmissionKind, Submission>>;

export function latestByKind(submissions: Submission[]): Latest {
  const latest: Latest = {};
  for (const s of submissions) {
    const cur = latest[s.kind];
    if (!cur || s.version > cur.version) latest[s.kind] = s;
  }
  return latest;
}

export function revisionCount(submissions: Submission[], kind: SubmissionKind) {
  const versions = submissions.filter((s) => s.kind === kind).length;
  return Math.max(0, versions - 1);
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
/** Version 1 is the first submission; version 2 is "Revisi I", and so on. */
export function revisionNumeral(version: number): string | null {
  if (version <= 1) return null;
  return ROMAN[version - 1] ?? String(version - 1);
}

export type Step = { key: string; done: boolean; date?: string | null; optional?: boolean; attention?: boolean };

export function timeline(part: Participation, job: Pick<Job, 'job_type' | 'product_option' | 'require_insight'>, latest: Latest, payout?: PayoutRequest | null): Step[] {
  const visit = workMode(job, part) === 'visit';
  const hasPrep = visit || job.product_option === 'shipped';
  const prepDone = visit ? !!part.visit_at && new Date(part.visit_at) <= new Date() : part.shipment_status === 'received';
  const steps: Step[] = [{ key: 'stepJoined', done: part.status === 'approved', date: part.decided_at }];
  if (hasPrep) steps.push({ key: 'stepPrep', done: prepDone, optional: true });
  steps.push(
    { key: 'stepStoryline', done: latest.storyline?.status === 'approved', date: latest.storyline?.approved_at, attention: latest.storyline?.status === 'revision' },
    { key: 'stepDraft', done: latest.draft?.status === 'approved', date: latest.draft?.approved_at, attention: latest.draft?.status === 'revision' },
    { key: 'stepCaption', done: latest.caption?.status === 'approved', date: latest.caption?.approved_at, attention: latest.caption?.status === 'revision' },
    { key: 'stepPosted', done: !!part.post_confirmed_at, date: part.post_confirmed_at },
  );
  if (job.require_insight) steps.push({ key: 'stepInsight', done: latest.insight?.status === 'approved', date: latest.insight?.approved_at, attention: latest.insight?.status === 'revision' });
  steps.push(
    { key: 'stepRequested', done: !!payout, date: payout?.requested_at },
    { key: 'stepPaid', done: payout?.status === 'transferred', date: payout?.transferred_on, attention: payout?.status === 'failed' },
  );
  return steps;
}

/** Index of the step to work on next (an optional step is skipped once a later step is done), or -1 when all are done. */
export function currentStep(steps: Step[]): number {
  return steps.findIndex((s, i) => !s.done && !(s.optional && steps.slice(i + 1).some((x) => x.done)));
}

export type Balance = {
  waitingTop: number;
  nextReadyDate: string | null;
  ready: number;
  readyIds: string[];
  inProcess: number;
  paid: number;
};

export function balance(parts: Participation[], requests: PayoutRequest[], today: string): Balance {
  const byId = new Map(requests.map((r) => [r.id, r]));
  const out: Balance = { waitingTop: 0, nextReadyDate: null, ready: 0, readyIds: [], inProcess: 0, paid: 0 };
  for (const p of parts) {
    if (p.status !== 'approved' || !p.agreed_fee || !p.ready_at) continue;
    const req = p.payout_request_id ? byId.get(p.payout_request_id) : undefined;
    if (req) {
      if (req.status === 'transferred') out.paid += p.agreed_fee;
      else if (req.status !== 'failed') out.inProcess += p.agreed_fee;
      continue;
    }
    if (p.ready_at <= today) {
      out.ready += p.agreed_fee;
      out.readyIds.push(p.id);
    } else {
      out.waitingTop += p.agreed_fee;
      if (!out.nextReadyDate || p.ready_at < out.nextReadyDate) out.nextReadyDate = p.ready_at;
    }
  }
  return out;
}
