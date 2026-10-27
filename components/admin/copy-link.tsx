'use client';

import { useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Copy } from 'lucide-react';
import { buttonClass } from '@/components/ui/button';

const noop = () => () => {};

/** Shows the full link for `path` on the current domain, with a copy button. */
export function CopyLink({ path }: { path: string }) {
  const t = useTranslations('share');
  const [copied, setCopied] = useState(false);
  // The domain is only known in the browser; the server render shows the path alone.
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => '');
  const url = `${origin}${path}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt(t('copyPrompt'), url);
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <code className="min-w-0 truncate rounded-lg bg-latar px-3 py-1.5 text-[15px]">{url.replace(/^https?:\/\//, '')}</code>
      <button type="button" onClick={copy} className={buttonClass('outline', 'sm')}>
        {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        {copied ? t('copied') : t('copy')}
      </button>
    </div>
  );
}
