import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { publicOrigin } from '@/lib/public-origin';

const PUBLIC_PATHS = ['/', '/masuk', '/auth', '/offline', '/privasi', '/ketentuan', '/job', '/api/cron'];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => (p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(`${p}/`)));
}

// Refreshes the Supabase session cookie on every request and sends signed-out
// visitors of private pages to the login screen.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items) => {
          items.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims;

  if (!signedIn && !isPublic(request.nextUrl.pathname)) {
    const url = new URL('/masuk', publicOrigin(request));
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|brand/|.*\\.(?:png|svg|jpg|jpeg|webp|ico)$).*)'],
};
