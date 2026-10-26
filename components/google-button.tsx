'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

/** Google sign-in that comes back to `next` (account is created on first sign-in). */
export function GoogleButton({ next, label, variant = 'primary', className }: {
  next: string; label: string; variant?: 'primary' | 'outline'; className?: string;
}) {
  const [pending, startTransition] = useTransition();
  function signIn() {
    startTransition(async () => {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      await createClient().auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    });
  }
  return (
    <Button type="button" variant={variant} className={className} onClick={signIn} disabled={pending} aria-busy={pending}>
      {label}
    </Button>
  );
}
