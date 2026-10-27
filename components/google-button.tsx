'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

// With NEXT_PUBLIC_GOOGLE_CLIENT_ID set, sign-in uses Google's own button (Google Identity
// Services) on our domain and hands the ID token to Supabase, so Google's screen names
// jointali.online (or "Tali" once the brand is verified) instead of the Supabase project URL.
// Without it, the button falls back to Supabase's redirect flow.
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

type Props = { next: string; label: string; variant?: 'primary' | 'outline'; className?: string; text?: 'continue_with' | 'signup_with' };

export function GoogleButton(props: Props) {
  return CLIENT_ID ? <GoogleIdentityButton {...props} clientId={CLIENT_ID} /> : <RedirectButton {...props} />;
}

function RedirectButton({ next, label, variant = 'primary', className }: Props) {
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

type GoogleId = {
  initialize(config: {
    client_id: string; nonce: string; callback: (r: { credential: string }) => void;
    use_fedcm_for_prompt?: boolean; itp_support?: boolean; context?: string;
  }): void;
  renderButton(el: HTMLElement, options: Record<string, string | number>): void;
};
declare global { interface Window { google?: { accounts: { id: GoogleId } } } }

let gsiLoading: Promise<void> | null = null;
function loadGsi(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  gsiLoading ??= new Promise((resolve, reject) => {
    const script = Object.assign(document.createElement('script'), { src: 'https://accounts.google.com/gsi/client', async: true, defer: true });
    script.onload = () => resolve();
    script.onerror = () => { gsiLoading = null; reject(new Error('gsi')); };
    document.head.appendChild(script);
  });
  return gsiLoading;
}

/** Random nonce for Supabase, and its SHA-256 (hex) for Google, so the ID token is bound to this sign-in. */
async function makeNonce(): Promise<[raw: string, hashed: string]> {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return [raw, Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')];
}

function GoogleIdentityButton({ next, label, clientId, className, text = 'continue_with', ...rest }: Props & { clientId: string }) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const holder = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'signing' | 'error' | 'unavailable'>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadGsi();
        const [raw, hashed] = await makeNonce();
        if (cancelled || !holder.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          nonce: hashed,
          use_fedcm_for_prompt: true,
          itp_support: true,
          context: text === 'signup_with' ? 'signup' : 'signin',
          callback: async ({ credential }) => {
            setState('signing');
            const { error } = await createClient().auth.signInWithIdToken({ provider: 'google', token: credential, nonce: raw });
            if (error) { setState('error'); return; }
            router.replace(next);
            router.refresh();
          },
        });
        window.google.accounts.id.renderButton(holder.current, {
          type: 'standard', theme: 'outline', size: 'large', shape: 'pill', text,
          width: Math.min(400, Math.max(200, holder.current.offsetWidth)), locale,
        });
        setState('ready');
      } catch {
        // Script blocked (ad blocker, in-app browser): fall back to the redirect flow below.
        if (!cancelled) setState('unavailable');
      }
    })();
    return () => { cancelled = true; };
  }, [clientId, locale, next, router, text]);

  if (state === 'unavailable') return <RedirectButton next={next} label={label} className={className} {...rest} />;
  return (
    <div className={className}>
      <div ref={holder} className="flex min-h-11 w-full justify-center" aria-busy={state === 'loading' || state === 'signing'} />
      {state === 'signing' && <p className="mt-1 text-center text-[13px] text-teks-redup">{t('signingIn')}</p>}
      {state === 'error' && <p className="mt-1 text-center text-[13px] text-bahaya" role="alert">{t('callbackFailed')}</p>}
    </div>
  );
}
