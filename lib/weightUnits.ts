const kilogramsPerPound = 0.45359237;

export function loadForDisplay(value: number | null, unit: string): number | null {
  if (value === null || unit !== 'lb') return value;
  return Math.round(value / kilogramsPerPound * 100) / 100;
}

export function loadForStorage(value: number | null, unit: string): number | null {
  if (value === null || unit !== 'lb') return value;
  return Math.round(value * kilogramsPerPound * 1e8) / 1e8;
}

export function comparableLoadUnit(unit: string): string {
  return unit === 'lb' ? 'kg' : unit;
}
