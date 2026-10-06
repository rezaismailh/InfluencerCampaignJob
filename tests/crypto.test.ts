import { randomBytes } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';

beforeAll(() => {
  process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString('base64');
});

describe('crypto', () => {
  it('round-trips and never stores plain text', async () => {
    const { encrypt, decrypt } = await import('@/lib/crypto');
    const enc = encrypt('1234567890');
    expect(enc).not.toContain('1234567890');
    expect(decrypt(enc)).toBe('1234567890');
  });
  it('returns null for tampered or empty values', async () => {
    const { encrypt, decrypt } = await import('@/lib/crypto');
    const enc = encrypt('rahasia');
    expect(decrypt(enc.slice(0, -4) + 'AAAA')).toBeNull();
    expect(decrypt(null)).toBeNull();
  });
});
