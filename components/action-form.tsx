'use client';

import { createContext, startTransition, useActionState, useContext, useEffect, useRef, type FormEvent, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Alert } from '@/components/ui/alert';
import type { ActionState } from '@/lib/action-state';

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

const StateContext = createContext<ActionState>({});
const PendingContext = createContext(false);

/** Form bound to a server action; shows the returned error/success and field errors. */
export function ActionForm({ action, children, className, resetOnSuccess = false, id, noValidate }: {
  action: Action;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  id?: string;
  noValidate?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  const te = useTranslations('errors');
  const ts = useTranslations('success');
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
    // Bring the first field that needs attention into view (fields come in page order).
    for (const key of Object.keys(state.fields ?? {})) {
      const el = ref.current?.querySelector<HTMLElement>(`[name="${CSS.escape(key)}"]`) ?? document.getElementById(`field-${key}`);
      if (!el) continue;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus({ preventScroll: true });
      break;
    }
  }, [state, resetOnSuccess]);

  // Submit through a transition instead of <form action>, so React doesn't clear
  // what the person typed when the server sends back a validation error.
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(e.currentTarget, submitter);
    startTransition(() => formAction(data));
  }

  return (
    <StateContext.Provider value={state}>
      <PendingContext.Provider value={pending}>
        <form ref={ref} onSubmit={onSubmit} className={className ?? 'space-y-4'} id={id} noValidate={noValidate}>
          {state.error && (
            <Alert tone="danger">
              {te.has(state.error) ? te(state.error) : te('generic')}
              {!!state.missing?.length && (
                <ul className="mt-1 list-disc pl-5">{state.missing.map((m) => <li key={m}>{m}</li>)}</ul>
              )}
            </Alert>
          )}
          {state.ok && state.success && <Alert tone="success">{ts.has(state.success) ? ts(state.success) : ts('saved')}</Alert>}
          {children}
        </form>
      </PendingContext.Provider>
    </StateContext.Provider>
  );
}

export function useFormState() {
  return useContext(StateContext);
}

/** Whether the surrounding ActionForm is waiting for its server action. */
export function useActionPending() {
  return useContext(PendingContext);
}

export function FieldError({ name }: { name: string }) {
  const state = useContext(StateContext);
  const te = useTranslations('errors');
  const key = state.fields?.[name];
  if (!key) return null;
  return <p className="text-[13px] leading-[18px] text-bahaya" role="alert">{te.has(key) ? te(key) : te('invalid')}</p>;
}
