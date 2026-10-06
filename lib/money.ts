const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

/** Integer rupiah → "Rp 1.250.000". */
export function formatRupiah(amount: number): string {
  // Intl gives "Rp 1.250.000" with a non-breaking space; keep it, it never wraps.
  return rupiah.format(amount);
}

/** "1.250.000" / "1250000" / "Rp 1.250.000" → 1250000. Returns null when empty or invalid. */
export function parseRupiah(input: string | null | undefined): number | null {
  if (input == null) return null;
  const digits = String(input).replace(/[^0-9]/g, '');
  if (!digits) return null;
  const value = Number(digits);
  return Number.isSafeInteger(value) ? value : null;
}
