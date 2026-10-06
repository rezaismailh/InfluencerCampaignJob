import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

const tones = {
  info: 'border-nila-100 bg-nila-50 text-nila-900',
  success: 'border-sukses/30 bg-sukses/10 text-teks',
  warning: 'border-peringatan/30 bg-peringatan/10 text-teks',
  danger: 'border-bahaya/30 bg-bahaya/10 text-teks',
};

export function Alert({ tone = 'info', children, className }: { tone?: keyof typeof tones; children: ReactNode; className?: string }) {
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('rounded-xl border p-3 text-[15px] leading-6', tones[tone], className)}>
      {children}
    </div>
  );
}
