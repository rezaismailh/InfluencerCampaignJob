// In-app browsers (Threads, Instagram, Facebook, TikTok, LINE…) are cut-down WebViews:
// Google refuses sign-in there and older ones fail to run the app. We send visitors on to
// their real browser: on Android an intent:// link opens Chrome directly; on iPhone
// x-safari-https:// opens Safari on iOS 17+, with written steps as the fallback.

export type InAppApp = 'threads' | 'instagram' | 'facebook' | 'tiktok' | 'line' | 'other';
export type InAppBrowser = { app: InAppApp; os: 'android' | 'ios' | 'other' };

const APPS: [InAppApp, RegExp][] = [
  ['threads', /Barcelona/], // Threads identifies itself by its codename
  ['instagram', /Instagram/],
  ['facebook', /FBAN|FBAV|FB_IAB|FBIOS|\[FB/],
  ['tiktok', /musical_ly|BytedanceWebview|TikTok|trill_/i],
  ['line', /\bLine\//],
];

/** The in-app browser behind a user agent, or null for a normal browser. */
export function detectInApp(ua: string | null | undefined): InAppBrowser | null {
  if (!ua) return null;
  const os = /Android/i.test(ua) ? 'android' : /iPhone|iPad|iPod/i.test(ua) ? 'ios' : 'other';
  const hit = APPS.find(([, re]) => re.test(ua));
  if (hit) return { app: hit[0], os };
  // Generic Android WebView ("; wv)") opened from some other app.
  if (os === 'android' && /; wv\)/.test(ua)) return { app: 'other', os };
  return null;
}

/**
 * Inline script (plain ES5, so it runs even where the app bundle does not) for the
 * "open in your browser" screen: fills in the links when the server could not and, on Android,
 * tries Chrome once per visit. Without Chrome the intent falls back to the "continue here"
 * link, which sets STAY_COOKIE and so cannot loop.
 */
export const GATE_SCRIPT = `(function(){try{
var open=document.getElementById('tali-open'),stay=document.getElementById('tali-stay');
if(!open||!stay)return;
var l=window.location,here=l.pathname+l.search,os=open.getAttribute('data-os');
var stayUrl=l.origin+'/api/inapp-stay?next='+encodeURIComponent(here);
var target=os==='android'
?'intent://'+l.host+here+'#Intent;scheme='+l.protocol.replace(':','')+';package=com.android.chrome;S.browser_fallback_url='+encodeURIComponent(stayUrl)+';end'
:'x-safari-'+l.href;
if(!open.getAttribute('href')||open.getAttribute('href')==='#'){open.setAttribute('href',target);stay.setAttribute('href',stayUrl);}else{target=open.getAttribute('href');}
if(os==='android'){var tried=false;try{tried=!!sessionStorage.getItem('tali-inapp-tried');sessionStorage.setItem('tali-inapp-tried','1');}catch(e){}
if(!tried)l.href=target;}
}catch(e){}})();`;

/** Request header set by proxy.ts with the public URL of the page being rendered. */
export const PAGE_URL_HEADER = 'x-tali-page-url';

/** "Continue here" link that remembers the choice and comes back to `url`. */
export function stayUrl(url: string): string {
  const u = new URL(url);
  return `${u.origin}/api/inapp-stay?next=${encodeURIComponent(u.pathname + u.search)}`;
}

/** Opens `url` in Chrome on Android; without Chrome, the "continue here" link instead (no loop). */
export function chromeIntentUrl(url: string): string {
  const u = new URL(url);
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${u.protocol.replace(':', '')};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(stayUrl(url))};end`;
}

/** Opens `url` in Safari from an in-app browser (iOS 17 and newer). */
export function safariUrl(url: string): string {
  return `x-safari-${url}`;
}

/** Cookie set by "continue here", so the prompt stays away for the rest of the visit. */
export const STAY_COOKIE = 'tali_inapp_stay';
