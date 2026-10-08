import 'server-only';
import { cache } from 'react';
import { getLocale } from 'next-intl/server';
import { createClient } from './supabase/server';

// Niches and personas, managed by the Tali team in Admin → Niche & persona.
// Creators and guests only receive active items (RLS); staff also see inactive ones.

export type TaxonomyKind = 'niche' | 'persona';
export type TaxonomyItem = { kind: TaxonomyKind; key: string; label_id: string; label_en: string | null; sort: number; active: boolean };

export const loadTaxonomy = cache(async () => {
  const supabase = await createClient();
  const locale = await getLocale();
  const { data } = await supabase.from('taxonomy').select('*').order('sort').order('label_id').returns<TaxonomyItem[]>();
  const items = data ?? [];
  const label = (item: TaxonomyItem) => (locale === 'en' && item.label_en) || item.label_id;
  const of = (kind: TaxonomyKind) => items.filter((i) => i.kind === kind);
  /** Label for a stored key; falls back to the key for items the viewer can't see. */
  const name = (kind: TaxonomyKind, key: string) => {
    const item = items.find((i) => i.kind === kind && i.key === key);
    return item ? label(item) : key;
  };
  /** Choices for a picker: active items plus any inactive ones already selected. */
  const choices = (kind: TaxonomyKind, selected: string[] = []) =>
    of(kind).filter((i) => i.active || selected.includes(i.key)).map((i) => ({ value: i.key, label: label(i) }));
  return { niches: of('niche'), personas: of('persona'), label, name, choices };
});

/** A stable key from a label: "Ibu & Anak" → "ibu_anak". */
export function taxonomyKey(label: string): string {
  return label.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'item';
}
