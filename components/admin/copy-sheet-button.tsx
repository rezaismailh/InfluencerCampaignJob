'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ClipboardCopy } from 'lucide-react';
import { buttonClass } from '@/components/ui/button';
import { cn } from '@/lib/cn';

/**
 * Copies a table as tab-separated text for pasting into Google Sheets: either `text`
 * (already in the page) or fetched from `href`. The fetch is handed to the clipboard as a
 * promise so Safari still counts it as part of the click.
 */
export function CopySheetButton({ text, href, label, variant = 'outline', className, disabled }: {
  text?: () => string; href?: string; label: string; variant?: 'primary' | 'outline'; className?: string; disabled?: boolean;
}) {
  const t = useTranslations('admin.sheet');
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function copy() {
    const load = async () => (text ? text() : await (await fetch(href!, { cache: 'no-store' })).text());
    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        const blob = load().then((s) => new Blob([s], { type: 'text/plain' }));
        await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })]);
      } else {
        await navigator.clipboard.writeText(await load());
      }
      setState('copied');
    } catch {
      setState('failed');
    }
    setTimeout(() => setState('idle'), 3000);
  }

  return (
    <button type="button" onClick={copy} disabled={disabled} className={cn(buttonClass(variant, 'sm'), className)} aria-live="polite">
      {state === 'copied' ? <Check className="size-4" aria-hidden /> : <ClipboardCopy className="size-4" aria-hidden />}
      {state === 'copied' ? t('copied') : state === 'failed' ? t('failed') : label}
    </button>
  );
}
