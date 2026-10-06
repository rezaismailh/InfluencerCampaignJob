export const PLATFORMS = ['instagram', 'tiktok', 'youtube', 'threads', 'x'] as const;
export type Platform = (typeof PLATFORMS)[number];

export type ParsedProfile = {
  platform: Platform;
  username: string | null;
  url: string;
};

const HOSTS: Record<string, Platform> = {
  'instagram.com': 'instagram',
  'tiktok.com': 'tiktok',
  'youtube.com': 'youtube',
  'youtu.be': 'youtube',
  'threads.net': 'threads',
  'threads.com': 'threads',
  'x.com': 'x',
  'twitter.com': 'x',
};

const RESERVED: Partial<Record<Platform, string[]>> = {
  instagram: ['p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'tv'],
  x: ['home', 'i', 'intent', 'search', 'explore', 'share', 'settings'],
};

const USERNAME = /^[A-Za-z0-9._-]{1,64}$/;

function toUrl(input: string): URL | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    return new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
}

function platformOf(url: URL): Platform | null {
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.|vm\.|vt\.)/, '');
  return HOSTS[host] ?? null;
}

/**
 * Reads the platform and username from a profile link and returns a clean URL
 * (query string and fragment removed). `username` is null when the link has no
 * handle in it, e.g. youtube.com/channel/<id>; the creator then types it in.
 */
export function parseProfileUrl(input: string): ParsedProfile | null {
  const url = toUrl(input);
  if (!url) return null;
  const platform = platformOf(url);
  if (!platform) return null;

  const segments = url.pathname.split('/').filter(Boolean);
  let username: string | null = null;
  const first = segments[0] ?? '';

  if (platform === 'tiktok' || platform === 'threads') {
    if (first.startsWith('@')) username = first.slice(1);
  } else if (platform === 'youtube') {
    if (first.startsWith('@')) username = first.slice(1);
  } else if (first && !RESERVED[platform]?.includes(first.toLowerCase())) {
    username = first.replace(/^@/, '');
  }

  if (username !== null && !USERNAME.test(username)) username = null;

  const cleanPath = username !== null
    ? platform === 'instagram' || platform === 'x'
      ? `/${username}`
      : `/@${username}`
    : url.pathname.replace(/\/+$/, '');
  const host = url.hostname.toLowerCase().replace(/^(m\.|vm\.|vt\.)/, '');
  return { platform, username, url: `https://${host}${cleanPath}` };
}

/** Username in a post link, or null for short links such as vt.tiktok.com/xyz. */
export function usernameInPostUrl(input: string): { platform: Platform; username: string | null } | null {
  const url = toUrl(input);
  if (!url) return null;
  const platform = platformOf(url);
  if (!platform) return null;
  if (/^(vt|vm)\./i.test(url.hostname)) return { platform, username: null };

  const segments = url.pathname.split('/').filter(Boolean);
  const at = segments.find((s) => s.startsWith('@'));
  if (at) return { platform, username: at.slice(1) };
  // x.com/<user>/status/<id>
  if (platform === 'x' && segments[1] === 'status') return { platform, username: segments[0] };
  return { platform, username: null };
}

/**
 * true/false when the post link shows a username; null when it cannot tell
 * (short links, instagram.com/reel/<id>) and a curator checks it by hand.
 */
export function postMatchesAccounts(
  postUrl: string,
  accounts: { platform: string; username: string }[],
): boolean | null {
  const found = usernameInPostUrl(postUrl);
  if (!found || found.username === null) return null;
  const name = found.username.toLowerCase();
  return accounts.some((a) => a.platform === found.platform && a.username.toLowerCase() === name);
}
