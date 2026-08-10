/** Rounds a number to 2 decimal places. */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Rounds a number to the specified decimal places. */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
