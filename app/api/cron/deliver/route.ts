import { NextResponse, type NextRequest } from 'next/server';
import { authorizedCron } from '@/lib/cron';
import { deliverPending } from '@/lib/notify';

// Every few minutes: email and push for notifications not sent yet (safety net for after()).
export async function POST(request: NextRequest) {
  if (!authorizedCron(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json(await deliverPending(100));
}
