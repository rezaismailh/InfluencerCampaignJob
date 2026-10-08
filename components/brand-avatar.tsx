import { Baby, CupSoda, Dumbbell, Gamepad2, HeartPulse, House, Plane, Shirt, Smartphone, Sparkles, Store, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { isBrandIcon, logoUrl, type BrandIcon } from '@/lib/brand-look';
import { cn } from '@/lib/cn';

export const BRAND_ICON_COMPONENTS: Record<BrandIcon, LucideIcon> = {
  store: Store, food: UtensilsCrossed, drink: CupSoda, beauty: Sparkles, fashion: Shirt, tech: Smartphone,
  home: House, health: HeartPulse, baby: Baby, travel: Plane, sport: Dumbbell, fun: Gamepad2,
};

/**
 * The brand's logo, or its category icon when there is none. Callers pass the logo this
 * viewer may see: a disguised brand's logo only reaches staff and accepted creators.
 */
export function BrandAvatar({ logo, icon, size = 40, className }: {
  logo?: string | null;
  icon?: string | null;
  size?: number;
  className?: string;
}) {
  const url = logoUrl(logo);
  const box = cn('flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-garis', className);
  if (url) {
    return (
      <span className={cn(box, 'bg-kertas')} style={{ width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="size-full object-contain" />
      </span>
    );
  }
  const Icon = BRAND_ICON_COMPONENTS[icon && isBrandIcon(icon) ? icon : 'store'];
  return (
    <span className={cn(box, 'border-transparent bg-nila-50 text-nila-800')} style={{ width: size, height: size }} aria-hidden>
      <Icon style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={2} />
    </span>
  );
}
