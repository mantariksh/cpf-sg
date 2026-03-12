import Decimal from 'decimal.js';
import { getRatesForYear } from './rates/index.js';
import type {
  AllocationBracket,
  AllocationOptions,
  AllocationResult,
} from './types.js';
import {
  computeCpfAge,
  currentYearMonth,
  MIN_CONTRIBUTION_YEAR,
  truncateToCent,
} from './utils.js';

function findAllocationBracket(
  table: AllocationBracket[],
  age: number,
): AllocationBracket | undefined {
  return table.find((b) => age <= b.maxAge);
}

export function computeAllocation(opts: AllocationOptions): AllocationResult {
  const { birthYear, birthMonth, totalContribution } = opts;
  const ym = currentYearMonth();
  const contributionYear = opts.contributionYear ?? ym.year;
  const contributionMonth = opts.contributionMonth ?? ym.month;

  if (contributionYear < MIN_CONTRIBUTION_YEAR) {
    throw new Error(
      `contributionYear must be ${MIN_CONTRIBUTION_YEAR} or later (got ${contributionYear})`,
    );
  }

  const age = computeCpfAge(
    birthYear,
    birthMonth,
    contributionYear,
    contributionMonth,
  );
  const yearRates = getRatesForYear(contributionYear);
  const bracket = findAllocationBracket(yearRates.allocations, age);
  if (!bracket) {
    throw new Error(`No allocation bracket found for cpfAge ${age}`);
  }

  const dTotal = new Decimal(totalContribution);
  const ma = truncateToCent(dTotal.times(bracket.maRatio));
  const saOrRa = truncateToCent(dTotal.times(bracket.saOrRaRatio));
  const oa = dTotal.minus(ma).minus(saOrRa).toNumber();

  if (age <= 55) {
    return {
      ordinaryAccount: oa,
      specialAccount: saOrRa,
      retirementAccount: 0,
      medisaveAccount: ma,
    };
  }

  return {
    ordinaryAccount: oa,
    specialAccount: 0,
    retirementAccount: saOrRa,
    medisaveAccount: ma,
  };
}
