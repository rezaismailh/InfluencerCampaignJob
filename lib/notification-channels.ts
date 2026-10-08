// Which channels each notification kind uses besides the in-app list.
// Email is kept for decisions and money; small steps go by push only; some stay in the app.
// This also keeps email volume (and the provider's quota or credits) down.

export type Channels = { email: boolean; push: boolean };

const IN_APP_ONLY = new Set([
  'application_rejected', // the most frequent one; shown in the app only
  'followers_updated',    // staff, frequent and low urgency
  'followers_stale',      // gentle 90-day reminder
]);

const PUSH_ONLY = new Set([
  'submission_approved',  // intermediate step (storyline/draft/caption)
  'payout_processing',    // transfer started; "transferred" still emails
  'social_verified',
]);

export function channelsFor(kind: string): Channels {
  if (IN_APP_ONLY.has(kind)) return { email: false, push: false };
  if (PUSH_ONLY.has(kind)) return { email: false, push: true };
  return { email: true, push: true };
}

/** Kinds that need the creator to act or signal a problem; shown in red. */
export const URGENT_KINDS = ['submission_revision', 'submission_rejected', 'payout_failed', 'participation_cancelled', 'social_rejected', 'payout_due_soon'] as const;
const GOOD_KINDS = new Set(['application_approved', 'submission_approved', 'post_confirmed', 'payout_ready', 'payout_transferred', 'social_verified', 'insight_approved']);

export function notificationTone(kind: string): 'urgent' | 'good' | 'normal' {
  if ((URGENT_KINDS as readonly string[]).includes(kind)) return 'urgent';
  return GOOD_KINDS.has(kind) ? 'good' : 'normal';
}
