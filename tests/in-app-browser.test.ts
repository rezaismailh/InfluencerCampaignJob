import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { detectInApp, GATE_SCRIPT } from '@/lib/in-app-browser';
import { ERROR_SCRIPT } from '@/lib/client-errors';

const UA = {
  threadsAndroid: 'Mozilla/5.0 (Linux; Android 13; SM-A145F Build/TP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.230 Mobile Safari/537.36 Barcelona 312.0.0.33.111 Android (33/13; 450dpi; 1080x2208; samsung; SM-A145F; a14; mt6769t; in_ID; 553489870)',
  threadsIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Barcelona 311.0.0.25.111 (iPhone12,1; iOS 16_6; in_ID; id; scale=2.00; 828x1792; 551720044)',
  instagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 325.0.0.35.91 (iPhone14,5; iOS 17_4; id_ID; id)',
  facebook: 'Mozilla/5.0 (Linux; Android 12; wv) AppleWebKit/537.36 Chrome/119.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/440.0.0.31.105;]',
  tiktok: 'Mozilla/5.0 (Linux; Android 11; wv) AppleWebKit/537.36 Chrome/112.0 Mobile Safari/537.36 trill_310503 BytedanceWebview/d8a21c6',
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 13; SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  safari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
};

describe('detectInApp', () => {
  it('recognises in-app browsers and the phone', () => {
    expect(detectInApp(UA.threadsAndroid)).toEqual({ app: 'threads', os: 'android' });
    expect(detectInApp(UA.threadsIos)).toEqual({ app: 'threads', os: 'ios' });
    expect(detectInApp(UA.instagram)).toEqual({ app: 'instagram', os: 'ios' });
    expect(detectInApp(UA.facebook)).toEqual({ app: 'facebook', os: 'android' });
    expect(detectInApp(UA.tiktok)).toEqual({ app: 'tiktok', os: 'android' });
  });
  it('leaves normal browsers alone', () => {
    expect(detectInApp(UA.chromeAndroid)).toBeNull();
    expect(detectInApp(UA.safari)).toBeNull();
    expect(detectInApp(null)).toBeNull();
  });
});

function runGate(os: 'android' | 'ios', tried = false) {
  const attrs: Record<string, Record<string, string>> = { 'tali-open': { 'data-os': os }, 'tali-stay': {} };
  const el = (id: string) => ({ getAttribute: (k: string) => attrs[id][k] ?? null, setAttribute: (k: string, v: string) => { attrs[id][k] = v; } });
  const store: Record<string, string> = tried ? { 'tali-inapp-tried': '1' } : {};
  const location = { href: 'https://app.jointali.online/j/abc123?x=1', origin: 'https://app.jointali.online', host: 'app.jointali.online', pathname: '/j/abc123', search: '?x=1', protocol: 'https:' };
  runInNewContext(GATE_SCRIPT, {
    window: { location }, document: { getElementById: el },
    sessionStorage: { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } },
    encodeURIComponent,
  });
  return { open: attrs['tali-open'].href, stay: attrs['tali-stay'].href, href: location.href };
}

describe('GATE_SCRIPT', () => {
  const stay = 'https://app.jointali.online/api/inapp-stay?next=%2Fj%2Fabc123%3Fx%3D1';
  it('sends Android to Chrome once, falling back to "continue here"', () => {
    const r = runGate('android');
    expect(r.open).toBe(`intent://app.jointali.online/j/abc123?x=1#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(stay)};end`);
    expect(r.stay).toBe(stay);
    expect(r.href).toBe(r.open);
    expect(runGate('android', true).href).toBe('https://app.jointali.online/j/abc123?x=1');
  });
  it('offers Safari on iPhone without redirecting', () => {
    const r = runGate('ios');
    expect(r.open).toBe('x-safari-https://app.jointali.online/j/abc123?x=1');
    expect(r.href).toBe('https://app.jointali.online/j/abc123?x=1');
  });
});

describe('ERROR_SCRIPT', () => {
  it('reports at most three errors', () => {
    const sent: string[] = [];
    const handlers: Record<string, (e: unknown) => void> = {};
    const window = { addEventListener: (type: string, fn: (e: unknown) => void) => { handlers[type] = fn; } } as Record<string, unknown>;
    runInNewContext(ERROR_SCRIPT, { window, location: { href: 'https://x/job' }, navigator: { sendBeacon: (_u: string, b: string) => sent.push(b) }, JSON, String });
    for (let i = 0; i < 5; i++) handlers.error({ message: `boom ${i}`, filename: 'a.js', lineno: 1, colno: 2, target: window });
    expect(sent).toHaveLength(3);
    expect(JSON.parse(sent[0])).toMatchObject({ kind: 'error', message: 'boom 0', source: 'a.js:1:2', url: 'https://x/job' });
  });
});
