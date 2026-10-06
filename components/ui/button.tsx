import Link from 'next/link';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'accent' | 'outline' | 'outlineLight' | 'ghost' | 'ghostLight' | 'danger';
type Size = 'md' | 'sm';

const base =
  'inline-flex items-center justify-center gap-2 rounded-[14px] font-bold text-[15px] leading-5 transition-colors disabled:opacity-50 disabled:pointer-events-none';
const sizes: Record<Size, string> = { md: 'min-h-11 px-5', sm: 'min-h-11 px-3 text-sm' };
const variants: Record<Variant, string> = {
  // Light background: nila with gading text. Dark (nila) background: limau with nila text.
  primary: 'bg-nila-800 text-gading hover:bg-nila-700',
  accent: 'bg-limau-400 text-nila-800 hover:bg-limau-300',
  outline: 'border border-nila-800 text-nila-800 bg-kertas hover:bg-nila-50',
  outlineLight: 'border border-gading text-gading hover:bg-nila-700',
  ghost: 'text-nila-800 hover:bg-nila-50',
  ghostLight: 'text-gading hover:bg-nila-700',
  danger: 'bg-bahaya text-kertas hover:opacity-90',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(base, sizes[size], variants[variant], className);
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ComponentProps<'button'> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
