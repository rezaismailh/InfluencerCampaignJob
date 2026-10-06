import type { Tone } from '@/components/ui/badge';
import type { ParticipationStatus, PayoutStatus, ReviewStatus, VerificationStatus } from '@/lib/types';

export const reviewTone: Record<ReviewStatus, Tone> = {
  pending_review: 'warning',
  sent_to_brand: 'info',
  approved: 'success',
  revision: 'warning',
  rejected: 'danger',
};

export const payoutTone: Record<PayoutStatus, Tone> = {
  requested: 'warning',
  processing: 'info',
  transferred: 'success',
  failed: 'danger',
};

export const verificationTone: Record<VerificationStatus, Tone> = {
  pending: 'warning',
  verified: 'success',
  rejected: 'danger',
};

export const participationTone: Record<ParticipationStatus, Tone> = {
  invited: 'info',
  applied: 'warning',
  approved: 'success',
  rejected: 'neutral',
  cancelled: 'neutral',
};
