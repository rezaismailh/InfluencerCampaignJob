import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

const control =
  'w-full rounded-xl border border-garis bg-kertas px-3 py-2.5 text-base text-teks placeholder:text-teks-redup/70 focus:border-nila-500 focus:outline-none';

export function Field({ label, hint, error, children, htmlFor }: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[15px] font-bold leading-5">{label}</label>
      {children}
      {hint && !error && <p className="text-[13px] leading-[18px] text-teks-redup">{hint}</p>}
      {error && <p className="text-[13px] leading-[18px] text-bahaya" role="alert">{error}</p>}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(control, 'min-h-11', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(control, 'min-h-24', className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(control, 'min-h-11 bg-kertas', className)} {...props} />;
}

export function Checkbox({ label, ...props }: ComponentProps<'input'> & { label: ReactNode }) {
  return (
    <label className="flex min-h-11 items-center gap-3 text-base">
      <input type="checkbox" className="size-5 accent-nila-800" {...props} />
      <span>{label}</span>
    </label>
  );
}
