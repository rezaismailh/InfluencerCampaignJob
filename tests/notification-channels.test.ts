import { describe, expect, it } from 'vitest';
import { channelsFor } from '@/lib/notification-channels';

describe('channelsFor', () => {
  it('keeps decisions and money on email', () => {
    for (const k of ['application_approved', 'submission_revision', 'payout_ready', 'payout_transferred', 'payout_failed', 'invited']) {
      expect(channelsFor(k)).toEqual({ email: true, push: true });
    }
  });
  it('sends small steps by push only', () => {
    expect(channelsFor('submission_approved')).toEqual({ email: false, push: true });
    expect(channelsFor('payout_processing')).toEqual({ email: false, push: true });
  });
  it('keeps rejections and follower notices in the app', () => {
    expect(channelsFor('application_rejected')).toEqual({ email: false, push: false });
    expect(channelsFor('followers_stale')).toEqual({ email: false, push: false });
  });
});
