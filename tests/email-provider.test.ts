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

  it('uses ZeptoMail when its token is set, with or without the prefix', async () => {
    vi.stubEnv('EMAIL_FROM', 'Tali <notifikasi@jointali.online>');
    vi.stubEnv('ZEPTOMAIL_TOKEN', 'Zoho-enczapikey abc123');
    vi.stubEnv('RESEND_API_KEY', 're_x');
    const fetch = stubFetch();
    await sendEmail('rani@example.com', 'Kabar', 'Halo <b>', 'https://app/x', 'Buka');
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.zeptomail.com/v1.1/email');
    expect((init.headers as Record<string, string>).Authorization).toBe('Zoho-enczapikey abc123');
    const body = JSON.parse(String(init.body));
    expect(body.from).toEqual({ name: 'Tali', address: 'notifikasi@jointali.online' });
    expect(body.to).toEqual([{ email_address: { address: 'rani@example.com' } }]);
    expect(body.htmlbody).toContain('Halo &lt;b&gt;');
  });

  it('falls back to Resend, and skips when nothing is configured', async () => {
    vi.stubEnv('EMAIL_FROM', 'Tali <n@x.id>');
    vi.stubEnv('ZEPTOMAIL_TOKEN', '');
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
    vi.stubEnv('ZEPTOMAIL_TOKEN', 't');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));
    await expect(sendEmail('a@b.id', 's', 'b', 'u', 'c')).rejects.toThrow('zeptomail 401');
  });
});
