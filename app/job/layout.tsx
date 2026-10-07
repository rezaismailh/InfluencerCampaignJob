import { CreatorShell, GuestShell } from '@/components/creator-shell';
import { getViewer } from '@/lib/auth';

// Job pages are public so creators can browse before signing up; joining still needs an account.
export default async function JobLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (viewer?.profile.role === 'creator' && viewer.profile.onboarded_at) {
    return <CreatorShell viewer={viewer}>{children}</CreatorShell>;
  }
  return <GuestShell viewer={viewer}>{children}</GuestShell>;
}
