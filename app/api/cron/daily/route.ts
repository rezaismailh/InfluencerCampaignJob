import { NextResponse, type NextRequest } from 'next/server';
import { authorizedCron } from '@/lib/cron';
import { deliverPending } from '@/lib/notify';
import { createAdminClient } from '@/lib/supabase/admin';

// Once a day (e.g. 07:00 WIB): "fee ready" notices and finance SLA reminders.
export async function POST(request: NextRequest) {
  if (!authorizedCron(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data, error } = await createAdminClient().rpc('run_daily');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const delivery = await deliverPending(200);
  return NextResponse.json({ ...data, ...delivery });
}
