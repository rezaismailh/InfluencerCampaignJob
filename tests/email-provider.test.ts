import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseFrom, sendEmail } from '@/lib/notify';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

function stubFetch() {
  const fetch = vi.fn(async (..._args: unknown[]) => new Response('{}', { status: 201 }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

describe('sendEmail', () => {
  it('parses the sender', () => {
    expect(parseFrom('Tali <notifikasi@jointali.online>')).toEqual({ name: 'Tali', address: 'notifikasi@jointali.online' });
    expect(parseFrom('"Tali" <a@b.id>')).toEqual({ name: 'Tali', address: 'a@b.id' });
    expect(parseFrom('a@b.id')).toEqual({ name: '', address: 'a@b.id' });
  });

  it('uses Brevo when its key is set', async () => {
    vi.stubEnv('EMAIL_FROM', 'Tali <notifikasi@jointali.online>');
    vi.stubEnv('BREVO_API_KEY', ' xkeysib-abc ');
    vi.stubEnv('RESEND_API_KEY', 're_x');
    const fetch = stubFetch();
    await sendEmail('rani@example.com', 'Kabar', 'Halo <b>', 'https://app/x', 'Buka');
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect((init.headers as Record<string, string>)['api-key']).toBe('xkeysib-abc');
    const body = JSON.parse(String(init.body));
    expect(body.sender).toEqual({ name: 'Tali', email: 'notifikasi@jointali.online' });
    expect(body.to).toEqual([{ email: 'rani@example.com' }]);
    expect(body.htmlContent).toContain('Halo &lt;b&gt;');
    expect(body.textContent).toContain('https://app/x');
  });

  it('falls back to Resend, and skips when nothing is configured', async () => {
    vi.stubEnv('EMAIL_FROM', 'Tali <n@x.id>');
    vi.stubEnv('BREVO_API_KEY', '');
    vi.stubEnv('RESEND_API_KEY', 're_x');
    const fetch = stubFetch();
    await sendEmail('a@b.id', 's', 'b', 'u', 'c');
    expect(fetch.mock.calls[0][0]).toBe('https://api.resend.com/emails');
    vi.stubEnv('RESEND_API_KEY', '');
    await sendEmail('a@b.id', 's', 'b', 'u', 'c');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('throws on a failed send so the caller can log it', async () => {
    vi.stubEnv('EMAIL_FROM', 'Tali <n@x.id>');
    vi.stubEnv('BREVO_API_KEY', 'k');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));
    await expect(sendEmail('a@b.id', 's', 'b', 'u', 'c')).rejects.toThrow('brevo 401');
  });
});
