import { getLocale, getTranslations } from 'next-intl/server';
import { setLocale } from '@/app/locale-actions';
import { LOCALES } from '@/i18n/config';
import { cn } from '@/lib/cn';

export async function LanguageSwitch() {
  const locale = await getLocale();
  const t = await getTranslations('locale');
  return (
    <div className="flex gap-2">
      {LOCALES.map((l) => (
        <form key={l} action={setLocale}>
          <input type="hidden" name="locale" value={l} />
          <button className={cn('min-h-11 rounded-full border px-4 text-[15px] font-medium',
            l === locale ? 'border-nila-800 bg-nila-800 text-gading' : 'border-garis bg-kertas')} aria-pressed={l === locale}>
            {t(l)}
          </button>
        </form>
      ))}
    </div>
  );
}
