'use client';

import { useFormStatus } from 'react-dom';
import type { ComponentProps } from 'react';
import { useActionPending } from '@/components/action-form';
import { Button } from './button';

export function SubmitButton({ pendingLabel, children, disabled, ...props }: ComponentProps<typeof Button> & { pendingLabel?: string }) {
  // ActionForm submits through a transition, so useFormStatus only covers plain <form action> forms.
  const status = useFormStatus();
  const actionPending = useActionPending();
  const pending = status.pending || actionPending;
  return (
    <Button type="submit" {...props} disabled={pending || disabled} aria-busy={pending}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
