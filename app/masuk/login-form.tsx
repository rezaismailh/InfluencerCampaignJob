'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { createClient } from '@/lib/supabase/client';
import { GoogleButton } from '@/components/google-button';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm({ next, callbackError }: { next: string; callbackError: boolean }) {
  const t = useTranslations('auth');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [error, setError] = useState<string | null>(callbackError ? t('callbackFailed') : null);
  const [pending, startTransition] = useTransition();

  function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL.test(email.trim())) return setError(t('invalidEmail'));
    setError(null);
    startTransition(async () => {
      const { error } = await createClient().auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (error) setError(t('sendFailed'));
      else setStep('code');
    });
  }

  function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const { error } = await createClient().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
      if (error) setError(t('invalidCode'));
      else {
        router.replace(next);
        router.refresh();
      }
    });
  }


  return (
    <div className="space-y-6">
      {error && <Alert tone="danger">{error}</Alert>}

      {step === 'email' && (
        <>
          {/* Google first: one tap, no code to copy from the inbox. */}
          <GoogleButton next={next} label={t('google')} className="w-full" />
          <p className="-mt-3 text-center text-[13px] text-teks-redup">{t('googleHint')}</p>
          <div className="flex items-center gap-3 text-[13px] text-teks-redup">
            <span className="h-px flex-1 bg-garis" />{t('orEmail')}<span className="h-px flex-1 bg-garis" />
          </div>
        </>
      )}

      {step === 'email' ? (
        <form onSubmit={sendCode} className="space-y-4" noValidate>
          <Field label={t('email')} htmlFor="email">
            <Input id="email" type="email" inputMode="email" autoComplete="email" placeholder={t('emailPlaceholder')}
              value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Button type="submit" variant="outline" className="w-full" disabled={pending}>{t('sendCode')}</Button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-4">
          <Alert tone="info">{t('codeSent', { email: email.trim() })}</Alert>
          <Field label={t('code')} htmlFor="code">
            <Input id="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={10}
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} required className="tabular tracking-[0.3em]" />
          </Field>
          <Button type="submit" className="w-full" disabled={pending || code.length < 6 /* Supabase sends 6–10 digits, set in Auth settings */}>{t('verify')}</Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => { setStep('email'); setCode(''); }}>
            {t('changeEmail')}
          </Button>
        </form>
      )}

    </div>
  );
}
