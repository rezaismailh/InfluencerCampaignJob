import { NextResponse, type NextRequest } from 'next/server';
import { detectInApp } from '@/lib/in-app-browser';

// Errors from visitors' browsers (error page and the early error listener in the root
// layout), written to the server log with the user agent so failures on specific phones
// or in-app browsers can be traced. Nothing is stored.
export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  try { body = JSON.parse((await request.text()).slice(0, 8000)); } catch { /* not JSON */ }
  const field = (k: string, max: number) => (typeof body[k] === 'string' ? (body[k] as string).slice(0, max) : undefined);
  const ua = request.headers.get('user-agent') ?? '';
  console.error('client error', JSON.stringify({
    kind: field('kind', 20), message: field('message', 500), source: field('source', 300), digest: field('digest', 100),
    stack: field('stack', 2000), url: field('url', 300), inApp: detectInApp(ua)?.app ?? null, ua: ua.slice(0, 300),
  }));
  return new NextResponse(null, { status: 204 });
}
