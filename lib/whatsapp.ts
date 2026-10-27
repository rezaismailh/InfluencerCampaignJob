// Click-to-chat links (wa.me). The message is sent from the curator's own WhatsApp;
// nothing goes through a WhatsApp API.

/** Phone number as wa.me expects it: digits only, Indonesian numbers with the 62 prefix. */
export function waNumber(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  const n = digits.startsWith('0') ? `62${digits.slice(1)}` : digits.startsWith('8') ? `62${digits}` : digits;
  return n.length >= 10 && n.length <= 15 ? n : null;
}

/** wa.me link to `phone` with `text` filled in, or null when the number is unusable. */
export function waLink(phone: string | null | undefined, text: string): string | null {
  const n = waNumber(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}
