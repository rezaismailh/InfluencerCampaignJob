import { NextResponse, type NextRequest } from 'next/server';
import { publicOrigin } from '@/lib/public-origin';
import { STAY_COOKIE } from '@/lib/in-app-browser';

// "Continue here" on the open-in-browser screen: remember the choice for a day, then go back.
export function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get('next') ?? '/';
  const safe = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  const res = NextResponse.redirect(new URL(safe, publicOrigin(request)));
  res.cookies.set(STAY_COOKIE, '1', { maxAge: 86_400, path: '/', sameSite: 'lax', secure: request.nextUrl.protocol === 'https:' || publicOrigin(request).startsWith('https:') });
  return res;
}
