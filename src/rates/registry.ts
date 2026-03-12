import type {
  AgeBracket,
  AllocationBracket,
  ResidencyStatus,
} from '../types.js';

export interface YearRates {
  contributions: Record<ResidencyStatus, AgeBracket[]>;
  allocations: AllocationBracket[];
}

const registry = new Map<number, YearRates>();

export function registerRates(year: number, rates: YearRates): void {
  registry.set(year, rates);
}

/**
 * Look up rates for a contribution year using floor semantics:
 * returns the rates registered for the highest year ≤ the requested year.
 * For example, if only 2026 is registered, any year ≥ 2026 uses the 2026 rates.
 */
export function getRatesForYear(contributionYear: number): YearRates {
  let best: number | undefined;
  for (const year of registry.keys()) {
    if (year <= contributionYear && (best === undefined || year > best)) {
      best = year;
    }
  }
  if (best === undefined) {
    throw new Error(
      `No rate tables registered for contributionYear ${contributionYear}`,
    );
  }
  // biome-ignore lint/style/noNonNullAssertion: best is guaranteed to be in the map
  return registry.get(best)!;
}
