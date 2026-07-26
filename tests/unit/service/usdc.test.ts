import { describe, expect, it } from 'vitest';
import { sumMinorUnits, toDisplayUsdc, toMinorUnits } from '@/server/lib/usdc';

// USDC on Stellar has 7 decimal places (10_000_000 minor units per USDC)
// 150.00 USDC = 150 * 10_000_000 = 1_500_000_000

describe('toMinorUnits', () => {
  it('converts 150.00 USDC to minor units', () => {
    expect(toMinorUnits('150.00')).toBe('1500000000');
  });

  it('converts 0.00 to zero', () => {
    expect(toMinorUnits('0.00')).toBe('0');
  });

  it('converts 750.00 correctly', () => {
    expect(toMinorUnits('750.00')).toBe('7500000000');
  });

  it('handles integer string', () => {
    expect(toMinorUnits('100')).toBe('1000000000');
  });
});

describe('toDisplayUsdc', () => {
  it('converts minor units to display for 150 USDC', () => {
    const result = toDisplayUsdc('1500000000');
    expect(result).toContain('150');
  });

  it('handles zero', () => {
    const result = toDisplayUsdc('0');
    expect(result).toBe('0.00');
  });
});

describe('sumMinorUnits', () => {
  it('sums an array of minor unit amounts', () => {
    // 3 × 150 USDC = 450 USDC
    const amounts = ['1500000000', '1500000000', '1500000000'];
    expect(sumMinorUnits(amounts)).toBe('4500000000');
  });

  it('handles empty array', () => {
    expect(sumMinorUnits([])).toBe('0');
  });

  it('handles single amount', () => {
    expect(sumMinorUnits(['7500000000'])).toBe('7500000000');
  });
});
