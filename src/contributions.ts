import type { ContributionOptions, ContributionResult, IncomeBracket } from './types.js';
import { OW_CEILING, ANNUAL_WAGE_CEILING, MIN_CONTRIBUTION_YEAR, roundTotal, roundEmployee, computeCpfAge, currentYearMonth } from './utils.js';
import { getRatesForYear } from './rates/index.js';

function findIncomeBracket(brackets: IncomeBracket[], tw: number): IncomeBracket | undefined {
  return brackets.find((b) => tw <= b.maxIncome);
}

export function computeContributions(opts: ContributionOptions): ContributionResult {
  const {
    birthYear,
    birthMonth,
    ordinaryWages,
    additionalWages = 0,
    residencyStatus = 'SC',
    monthlyOrdinaryWages = [],
  } = opts;
  const ym = currentYearMonth();
  const contributionYear = opts.contributionYear ?? ym.year;
  const contributionMonth = opts.contributionMonth ?? ym.month;

  if (contributionYear < MIN_CONTRIBUTION_YEAR) {
    throw new Error(`contributionYear must be ${MIN_CONTRIBUTION_YEAR} or later (got ${contributionYear})`);
  }

  if (monthlyOrdinaryWages.length > 11) {
    throw new Error(
      `monthlyOrdinaryWages has ${monthlyOrdinaryWages.length} entries (max 11 — the current month's OW is already counted via ordinaryWages)`,
    );
  }

  const age = computeCpfAge(birthYear, birthMonth, contributionYear, contributionMonth);

  const cappedOW = Math.min(ordinaryWages, OW_CEILING);
  const totalOWSubjectToCPF = monthlyOrdinaryWages.reduce(
    (sum, ow) => sum + Math.min(ow, OW_CEILING),
    0,
  ) + cappedOW;
  const awCeiling = Math.max(0, ANNUAL_WAGE_CEILING - totalOWSubjectToCPF);
  const cappedAW = Math.min(additionalWages, awCeiling);
  const tw = cappedOW + cappedAW;

  const yearRates = getRatesForYear(contributionYear);
  const ageBracket = yearRates.contributions[residencyStatus].find((b) => age <= b.maxAge);
  if (!ageBracket) {
    return { employee: 0, employer: 0, total: 0 };
  }

  const incomeBracket = findIncomeBracket(ageBracket.incomeBrackets, tw);
  if (!incomeBracket) {
    return { employee: 0, employer: 0, total: 0 };
  }

  const raw = incomeBracket.compute(cappedOW, cappedAW);
  const total = roundTotal(raw.total);
  const employee = roundEmployee(raw.employee);
  const employer = total - employee;

  return { employee, employer, total };
}
