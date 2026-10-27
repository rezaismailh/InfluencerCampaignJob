import 'server-only';
import { cookies, headers } from 'next/headers';
import { detectInApp, STAY_COOKIE, type InAppBrowser } from './in-app-browser';

/** The visitor's in-app browser (from the user agent), or null in a normal browser. */
export async function getInApp(): Promise<InAppBrowser | null> {
  return detectInApp((await headers()).get('user-agent'));
}

/** In an in-app browser and has not chosen to continue there. */
export async function shouldLeaveInApp(): Promise<InAppBrowser | null> {
  const inApp = await getInApp();
  if (!inApp || (await cookies()).get(STAY_COOKIE)) return null;
  return inApp;
}
