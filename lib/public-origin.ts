import type { NextRequest } from 'next/server';

/**
 * The origin the visitor actually used. Behind Railway's proxy, request.nextUrl
 * reports the internal address (http://localhost:8080), so redirects built from
 * it send people to localhost. Use the forwarded host instead.
 */
export function publicOrigin(request: NextRequest): string {
  const host = (request.headers.get('x-forwarded-host') ?? request.headers.get('host'))?.split(',')[0].trim();
  if (!host) return process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0].trim() ?? (local ? 'http' : 'https');
  return `${proto}://${host}`;
}
