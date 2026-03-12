import Decimal from 'decimal.js';

export const OW_CEILING = 8000;
export const ANNUAL_WAGE_CEILING = 102000;
export const MIN_CONTRIBUTION_YEAR = 2026;

/** Round to nearest dollar (half-up): used for total contribution */
export function roundTotal(n: Decimal): number {
  return n.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

/** Floor to nearest dollar: used for employee share */
export function roundEmployee(n: Decimal): number {
  return n.toDecimalPlaces(0, Decimal.ROUND_FLOOR).toNumber();
}

/** Truncate to cent (floor): used for MA and SA/RA allocation */
export function truncateToCent(n: Decimal): number {
  return n.toDecimalPlaces(2, Decimal.ROUND_FLOOR).toNumber();
}

/**
 * Compute the CPF effective age for bracket lookup.
 *
 * CPF rule: "the change in rates is applied from the first day of the month
 * after your birthday." So in the birthday month the old bracket still applies;
 * from the next month the new bracket applies.
 *
 * The +1 when past the birthday month ensures the bracket boundary (e.g. ≤55)
 * is crossed at the right time: a person turning 55 in June is cpfAge 55 in
 * June (≤55 bracket) and cpfAge 56 in July (>55 bracket).
 */
export function computeCpfAge(
  birthYear: number,
  birthMonth: number,
  contributionYear: number,
  contributionMonth: number,
): number {
  if (birthMonth < 1 || birthMonth > 12) {
    throw new Error(`Invalid birthMonth: ${birthMonth} (must be 1–12)`);
  }
  if (contributionMonth < 1 || contributionMonth > 12) {
    throw new Error(
      `Invalid contributionMonth: ${contributionMonth} (must be 1–12)`,
    );
  }
  if (birthYear < 1900) {
    throw new Error(`Invalid birthYear: ${birthYear} (must be 1900 or later)`);
  }
  if (birthYear >= contributionYear) {
    throw new Error(
      `birthYear (${birthYear}) must be before contributionYear (${contributionYear})`,
    );
  }
  const yearDiff = contributionYear - birthYear;
  return contributionMonth > birthMonth ? yearDiff + 1 : yearDiff;
}

/** Return current year and month as defaults for contribution period. */
export function currentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}
