import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from './config';

// No locale in the URL: the language comes from a cookie (Indonesian by default).
export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
  return {
    locale,
    timeZone: 'Asia/Jakarta',
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
