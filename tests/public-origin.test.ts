import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { publicOrigin } from '@/lib/public-origin';

const req = (headers: Record<string, string>) => new NextRequest('http://localhost:8080/auth/callback', { headers });

describe('publicOrigin', () => {
  it('uses the forwarded host behind a proxy', () => {
    expect(publicOrigin(req({ host: 'localhost:8080', 'x-forwarded-host': 'app.jointali.online', 'x-forwarded-proto': 'https' })))
      .toBe('https://app.jointali.online');
  });
  it('uses the Host header and assumes https for public hosts', () => {
    expect(publicOrigin(req({ host: 'tali.up.railway.app' }))).toBe('https://tali.up.railway.app');
  });
  it('keeps http for local development', () => {
    expect(publicOrigin(req({ host: 'localhost:3000' }))).toBe('http://localhost:3000');
  });
});
