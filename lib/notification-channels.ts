// Which channels each notification kind uses besides the in-app list.
// Email is kept for decisions and money; small steps go by push only; some stay in the app.
// This also keeps email volume inside the Resend quota.

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
