'use client';

import { useState, type ComponentProps } from 'react';
import { cn } from '@/lib/cn';

const grouped = new Intl.NumberFormat('id-ID');

/** Rupiah amount with an "Rp" prefix and thousands dots as you type; parseRupiah reads it back on the server. */
export function RupiahInput({ className, defaultValue, ...props }: Omit<ComponentProps<'input'>, 'type' | 'value' | 'onChange' | 'defaultValue'> & { defaultValue?: number | null }) {
  const [value, setValue] = useState(defaultValue ? grouped.format(defaultValue) : '');
  return (
    <div className={cn('flex min-h-11 items-center rounded-xl border border-garis bg-kertas focus-within:border-nila-500', className)}>
      <span className="pl-3 pr-1 font-bold text-teks-redup" aria-hidden>Rp</span>
      <input {...props} type="text" inputMode="numeric" autoComplete="off" value={value}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 12);
          setValue(digits ? grouped.format(Number(digits)) : '');
        }}
        className="min-w-0 flex-1 bg-transparent py-2.5 pr-3 text-base font-bold text-teks tabular outline-none" />
    </div>
  );
}
