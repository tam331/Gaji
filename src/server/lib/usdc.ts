/** Convert USDC display amount (e.g. "150.00") to minor units string (e.g. "150000000") */
export function toMinorUnits(display: string): string {
  const [whole, frac = ''] = display.split('.');
  const fracPadded = frac.padEnd(7, '0').slice(0, 7);
  return (BigInt(whole) * 10_000_000n + BigInt(fracPadded)).toString();
}

/** Convert minor units string to display USDC (e.g. "150000000" → "150.00") */
export function toDisplayUsdc(minor: string): string {
  const n = BigInt(minor);
  const whole = n / 10_000_000n;
  const frac = n % 10_000_000n;
  const fracStr = frac.toString().padStart(7, '0').replace(/0+$/, '') || '00';
  return `${whole}.${fracStr.slice(0, 2)}`;
}

/** Sum array of minor unit strings */
export function sumMinorUnits(amounts: string[]): string {
  return amounts.reduce((acc, a) => (BigInt(acc) + BigInt(a)).toString(), '0');
}
