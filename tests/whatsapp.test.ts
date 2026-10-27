import { describe, expect, it } from 'vitest';
import { waLink, waNumber } from '@/lib/whatsapp';

describe('waNumber', () => {
  it('normalises Indonesian numbers to 62…', () => {
    expect(waNumber('081234567890')).toBe('6281234567890');
    expect(waNumber('+62 812-3456-7890')).toBe('6281234567890');
    expect(waNumber('81234567890')).toBe('6281234567890');
    expect(waNumber('6281234567890')).toBe('6281234567890');
  });
  it('rejects empty or too short numbers', () => {
    expect(waNumber(null)).toBeNull();
    expect(waNumber('')).toBeNull();
    expect(waNumber('0812')).toBeNull();
  });
});

describe('waLink', () => {
  it('encodes the message', () => {
    expect(waLink('0812345678901', 'Halo *Rina*!\nlink: https://x.id/j/ab?c=1')).toBe(
      'https://wa.me/62812345678901?text=Halo%20*Rina*!%0Alink%3A%20https%3A%2F%2Fx.id%2Fj%2Fab%3Fc%3D1',
    );
  });
  it('returns null without a usable number', () => {
    expect(waLink(undefined, 'x')).toBeNull();
  });
});
