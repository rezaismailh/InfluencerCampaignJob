import { describe, expect, it } from 'vitest';
import { parseProfileUrl, postMatchesAccounts, usernameInPostUrl } from '@/lib/social';

describe('parseProfileUrl', () => {
  it.each([
    ['https://www.instagram.com/annsrzka/reels/', 'instagram', 'annsrzka', 'https://www.instagram.com/annsrzka'],
    ['instagram.com/annsrzka?igsh=abc123', 'instagram', 'annsrzka', 'https://instagram.com/annsrzka'],
    ['https://www.tiktok.com/@diary_ramz?_r=1&_t=ZS-99', 'tiktok', 'diary_ramz', 'https://www.tiktok.com/@diary_ramz'],
    ['http://www.tiktok.com/@jeolapar', 'tiktok', 'jeolapar', 'https://www.tiktok.com/@jeolapar'],
    ['https://www.youtube.com/@tali.creator', 'youtube', 'tali.creator', 'https://www.youtube.com/@tali.creator'],
    ['https://www.threads.net/@okkyors_', 'threads', 'okkyors_', 'https://www.threads.net/@okkyors_'],
    ['https://www.threads.com/@okkyors_', 'threads', 'okkyors_', 'https://www.threads.com/@okkyors_'],
    ['https://x.com/harris', 'x', 'harris', 'https://x.com/harris'],
    ['https://twitter.com/harris/', 'x', 'harris', 'https://twitter.com/harris'],
    ['https://m.tiktok.com/@abc', 'tiktok', 'abc', 'https://tiktok.com/@abc'],
  ])('%s', (input, platform, username, url) => {
    expect(parseProfileUrl(input)).toEqual({ platform, username, url });
  });

  it('returns a null username when the link has no handle', () => {
    expect(parseProfileUrl('https://www.youtube.com/channel/UC123')).toMatchObject({ platform: 'youtube', username: null });
    expect(parseProfileUrl('https://www.instagram.com/p/Cx1/')).toMatchObject({ platform: 'instagram', username: null });
    expect(parseProfileUrl('https://www.tiktok.com/discover')).toMatchObject({ platform: 'tiktok', username: null });
  });

  it('rejects other hosts and garbage', () => {
    expect(parseProfileUrl('https://facebook.com/someone')).toBeNull();
    expect(parseProfileUrl('')).toBeNull();
    expect(parseProfileUrl('not a url at all')).toBeNull();
  });
});

describe('post links', () => {
  it('reads usernames from full post links', () => {
    expect(usernameInPostUrl('https://www.tiktok.com/@cra/video/123')).toEqual({ platform: 'tiktok', username: 'cra' });
    expect(usernameInPostUrl('https://x.com/harris/status/99')).toEqual({ platform: 'x', username: 'harris' });
  });

  it('cannot tell for short links', () => {
    expect(usernameInPostUrl('https://vt.tiktok.com/ZSbHtk1Ax/')).toEqual({ platform: 'tiktok', username: null });
    expect(postMatchesAccounts('https://vt.tiktok.com/ZSbHtk1Ax/', [{ platform: 'tiktok', username: 'cra' }])).toBeNull();
  });

  it('matches against registered accounts case-insensitively', () => {
    const accounts = [{ platform: 'tiktok', username: 'Cra' }];
    expect(postMatchesAccounts('https://www.tiktok.com/@cra/video/1', accounts)).toBe(true);
    expect(postMatchesAccounts('https://www.tiktok.com/@other/video/1', accounts)).toBe(false);
  });
});

describe('profileFromInput', () => {
  it('accepts a bare username and builds the link', async () => {
    const { profileFromInput } = await import('@/lib/social');
    expect(profileFromInput('instagram', '@isreza')).toEqual({ ok: true, url: 'https://www.instagram.com/isreza', username: 'isreza' });
    expect(profileFromInput('tiktok', 'isreza')).toEqual({ ok: true, url: 'https://www.tiktok.com/@isreza', username: 'isreza' });
    expect(profileFromInput('instagram', '@isreza.id')).toMatchObject({ ok: true, username: 'isreza.id' });
    expect(profileFromInput('instagram', 'instagram.com/isreza')).toMatchObject({ ok: true, username: 'isreza' });
  });
  it('accepts a link for the chosen platform and rejects others', async () => {
    const { profileFromInput } = await import('@/lib/social');
    expect(profileFromInput('instagram', 'https://www.instagram.com/isreza?igsh=abc')).toMatchObject({ ok: true, username: 'isreza' });
    expect(profileFromInput('tiktok', 'https://www.instagram.com/isreza')).toEqual({ ok: false, error: 'platform_mismatch' });
    expect(profileFromInput('instagram', 'https://example.com/x')).toEqual({ ok: false, error: 'unsupported_link' });
    expect(profileFromInput('instagram', '  ')).toEqual({ ok: false, error: 'required' });
  });
});
