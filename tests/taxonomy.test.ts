import { describe, expect, it } from 'vitest';
import { taxonomyKey } from '@/lib/taxonomy';

describe('taxonomyKey', () => {
  it('turns labels into stable keys', () => {
    expect(taxonomyKey('Ibu & Anak')).toBe('ibu_anak');
    expect(taxonomyKey('  Otomotif ')).toBe('otomotif');
    expect(taxonomyKey('Kafe/Kopi')).toBe('kafe_kopi');
    expect(taxonomyKey('!!!')).toBe('item');
  });
});
