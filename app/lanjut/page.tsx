import { redirect } from 'next/navigation';
import { homeFor, requireViewer } from '@/lib/auth';

// Landing spot after login and from the installed app icon: sends each role home.
export default async function Continue() {
  const { profile } = await requireViewer();
  if (profile.role === 'creator' && !profile.onboarded_at) redirect('/onboarding');
  redirect(homeFor(profile.role));
}
