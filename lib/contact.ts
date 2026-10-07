// Public contact details, set per deployment so they can change without a code change.
export function contact() {
  const wa = process.env.CONTACT_WA?.replace(/\D/g, '') || null;
  const email = process.env.CONTACT_EMAIL?.trim() || null;
  return { wa, email };
}
