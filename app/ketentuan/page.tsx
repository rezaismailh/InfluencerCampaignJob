import { getTranslations } from 'next-intl/server';
import { LegalPage } from '@/components/legal-page';

export async function generateMetadata() {
  const tm = await getTranslations('legal');
  return { title: tm('termsTitle') };
}

export default function Page() {
  return <LegalPage doc="terms" />;
}
