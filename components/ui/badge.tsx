import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

const tones: Record<Tone, string> = {
  neutral: 'bg-latar text-teks-redup border-garis',
  success: 'bg-sukses/10 text-sukses border-sukses/30',
  warning: 'bg-peringatan/10 text-peringatan border-peringatan/30',
  danger: 'bg-bahaya/10 text-bahaya border-bahaya/30',
  info: 'bg-nila-50 text-info border-nila-100',
  accent: 'bg-limau-400 text-nila-800 border-limau-400',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[13px] font-medium leading-[18px]', tones[tone], className)}>
      {children}
    </span>
  );
}
