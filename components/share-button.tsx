'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, MessageCircle, Share2 } from 'lucide-react';
import { buttonClass } from '@/components/ui/button';

/** Share a page: the phone's share sheet when available, otherwise copy the link; plus a direct WhatsApp link. */
export function ShareButton({ path, title, text }: { path: string; title: string; text: string }) {
  const t = useTranslations('share');
  const [copied, setCopied] = useState(false);
  const url = () => `${window.location.origin}${path}`;

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: url() });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt(t('copyPrompt'), url());
    }
  }

  return (
    <div className="flex gap-2">
      <button type="button" onClick={share} className={buttonClass('outline', 'sm', 'flex-1')}>
        {copied ? <Check className="size-5" aria-hidden /> : <Share2 className="size-5" aria-hidden />}
        {copied ? t('copied') : t('share')}
      </button>
      <button type="button" className={buttonClass('outline', 'sm', 'flex-1')}
        onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url()}`)}`, '_blank', 'noopener')}>
        <MessageCircle className="size-5" aria-hidden /> {t('whatsapp')}
      </button>
    </div>
  );
}
