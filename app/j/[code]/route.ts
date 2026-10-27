import { NextResponse, type NextRequest } from 'next/server';
import { publicOrigin } from '@/lib/public-origin';
import { createClient } from '@/lib/supabase/server';

// Short share link: /j/<code> → /job/<id>, keeping any ?utm_… parameters.
// Unknown or draft codes land on the job list instead of an error page.
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const origin = publicOrigin(request);
  const id = /^[a-z0-9]{4,32}$/i.test(code)
    ? (await (await createClient()).rpc('job_id_by_code', { p_code: code })).data as string | null
    : null;
  const target = new URL(id ? `/job/${id}` : '/job', origin);
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.set(key, value));
  return NextResponse.redirect(target);
}
