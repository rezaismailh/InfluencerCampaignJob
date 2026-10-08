// Shared shape returned by server actions to forms (useActionState).
export type ActionState = {
  ok?: boolean;
  /** i18n key under "errors" */
  error?: string;
  /** i18n key under "success" */
  success?: string;
  fields?: Record<string, string>;
  /** Already-translated labels of what is missing, listed under the error. */
  missing?: string[];
};

export const initialState: ActionState = {};

// Exception messages raised by the database functions; anything else is "generic".
const KNOWN = [
  'not_authenticated', 'forbidden', 'not_found', 'invalid_state', 'job_not_open', 'job_closed',
  'onboarding_incomplete', 'no_verified_account', 'no_social_account', 'account_not_verified', 'tier_not_offered', 'followers_below_minimum', 'rate_required',
  'rate_above_cap', 'already_applied', 'quota_full', 'fee_required', 'storyline_not_approved',
  'submission_locked', 'invalid_docs_url', 'invalid_drive_url', 'invalid_path', 'caption_required',
  'already_posted', 'content_not_approved', 'invalid_url', 'invalid_date', 'payout_account_required',
  'nothing_selected', 'not_ready', 'below_minimum', 'feedback_required', 'invalid_transition',
  'transfer_date_required', 'reason_required', 'not_allowed',
];

export function dbErrorKey(error: { message?: string; code?: string } | null | undefined): string {
  if (!error) return 'generic';
  const msg = error.message ?? '';
  const hit = KNOWN.find((k) => msg.includes(k));
  if (hit) return hit;
  if (error.code === '23505') return 'duplicate';
  return 'generic';
}
