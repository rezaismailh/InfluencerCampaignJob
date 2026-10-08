'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { removeSocialAccount } from '@/app/(creator)/actions';

// A plain button (not a nested form), so the account list can sit inside the profile form.
export function SocialRemoveButton({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} aria-label={label}
      onClick={() => start(async () => {
        const data = new FormData();
        data.set('id', id);
        await removeSocialAccount(data);
      })}
      className="inline-flex size-11 items-center justify-center rounded-full text-teks-redup hover:bg-latar disabled:opacity-50">
      <Trash2 className="size-5" aria-hidden />
    </button>
  );
}
