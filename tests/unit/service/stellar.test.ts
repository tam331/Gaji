import { describe, it, expect } from 'vitest';
import {
  simulateStellarTxHash,
  simulateClaimableBalanceId,
  truncateAddress,
} from '@/server/lib/stellar';

describe('simulateStellarTxHash', () => {
  it('returns a 64-char hex string', () => {
    const hash = simulateStellarTxHash();
    expect(hash).toHaveLength(64);
    expect(/^[0-9A-F]+$/.test(hash)).toBe(true);
  });

  it('returns unique hashes on each call', () => {
    const h1 = simulateStellarTxHash();
    const h2 = simulateStellarTxHash();
    expect(h1).not.toBe(h2);
  });
});

describe('simulateClaimableBalanceId', () => {
  it('starts with 00000000 (standard prefix)', () => {
    const cbId = simulateClaimableBalanceId();
    expect(cbId.startsWith('00000000')).toBe(true);
  });

  it('is 64 chars total', () => {
    const cbId = simulateClaimableBalanceId();
    expect(cbId.length).toBe(64);
  });
});

describe('truncateAddress', () => {
  it('truncates a long stellar address', () => {
    const addr = 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPGZIXUNHGCKWNXPZ6WHENU32K';
    const result = truncateAddress(addr);
    expect(result).toContain('...');
    expect(result.length).toBeLessThan(addr.length);
  });

  it('returns short strings as-is', () => {
    expect(truncateAddress('SHORT')).toBe('SHORT');
  });

  it('handles empty string', () => {
    expect(truncateAddress('')).toBe('');
  });
});
