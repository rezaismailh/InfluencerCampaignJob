'use client';

import { createContext, useActionState, useContext, useEffect, useRef, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Alert } from '@/components/ui/alert';
import type { ActionState } from '@/lib/action-state';

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

const StateContext = createContext<ActionState>({});

/** Form bound to a server action; shows the returned error/success and field errors. */
export function ActionForm({ action, children, className, resetOnSuccess = false, id }: {
  action: Action;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  id?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  const te = useTranslations('errors');
  const ts = useTranslations('success');

  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <StateContext.Provider value={state}>
      <form ref={ref} action={formAction} className={className ?? 'space-y-4'} id={id}>
        {state.error && <Alert tone="danger">{te.has(state.error) ? te(state.error) : te('generic')}</Alert>}
        {state.ok && state.success && <Alert tone="success">{ts.has(state.success) ? ts(state.success) : ts('saved')}</Alert>}
        {children}
      </form>
    </StateContext.Provider>
  );
}

export function useFormState() {
  return useContext(StateContext);
}

export function FieldError({ name }: { name: string }) {
  const state = useContext(StateContext);
  const te = useTranslations('errors');
  const key = state.fields?.[name];
  if (!key) return null;
  return <p className="text-[13px] leading-[18px] text-bahaya" role="alert">{te.has(key) ? te(key) : te('invalid')}</p>;
}
