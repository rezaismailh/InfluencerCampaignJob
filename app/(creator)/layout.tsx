import { CreatorShell } from '@/components/creator-shell';
import { requireCreator } from '@/lib/auth';

export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireCreator();
  return <CreatorShell viewer={viewer}>{children}</CreatorShell>;
}
