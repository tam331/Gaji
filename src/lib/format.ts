/** Display USDC from minor units (7 decimals = stroops * 10 for USDC) */
export function displayUsdc(minor: string): string {
  try {
    const n = BigInt(minor);
    const whole = n / 10_000_000n;
    const frac = n % 10_000_000n;
    const fracStr = frac.toString().padStart(7, '0').slice(0, 2);
    return `${whole}.${fracStr}`;
  } catch {
    return minor;
  }
}

/** Truncate stellar address */
export function truncateAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/** Format date */
export function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(d: string | Date): string {
  return new Date(d).toLocaleString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
