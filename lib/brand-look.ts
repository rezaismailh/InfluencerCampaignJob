// How a brand appears on job cards: its logo when the name is shown, otherwise a
// category icon (disguised brands) or the first letter of the name.

export const BRAND_ICONS = ['store', 'food', 'drink', 'beauty', 'fashion', 'tech', 'home', 'health', 'baby', 'travel', 'sport', 'fun'] as const;
export type BrandIcon = (typeof BRAND_ICONS)[number];

export const LOGO_BUCKET = 'brand-logos';
export const LOGO_MAX_BYTES = 1024 * 1024;
export const LOGO_PATH = /^jobs\/[0-9a-f-]{36}\.(png|jpg|webp)$/;

export function isBrandIcon(value: string): value is BrandIcon {
  return (BRAND_ICONS as readonly string[]).includes(value);
}

export function logoUrl(path: string | null | undefined): string | null {
  if (!path || !LOGO_PATH.test(path)) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${LOGO_BUCKET}/${path}`;
}
