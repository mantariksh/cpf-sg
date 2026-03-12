import Decimal from 'decimal.js';
import type { AgeBracket, AllocationBracket, IncomeBracket, RawContribution } from '../types.js';
import type { YearRates } from './registry.js';

const D = (n: number) => new Decimal(n);
const ZERO: RawContribution = { total: D(0), employee: D(0) };

// ── Income bracket helpers ─────────────────────────────────────────
// These encode the three formula shapes used in the 2026 CPF tables.
// Each helper returns an IncomeBracket with its compute function.

/** TW ≤ $50: no contribution. */
function nil(): IncomeBracket {
  return { maxIncome: 50, compute: () => ZERO };
}

/** $50 < TW ≤ $500: employer pays a flat rate on TW, employee pays nothing. */
function employerOnly(rate: number): IncomeBracket {
  return {
    maxIncome: 500,
    compute: (ow, aw) => {
      const tw = D(ow).plus(aw);
      return { total: D(rate).times(tw), employee: D(0) };
    },
  };
}

/** $500 < TW ≤ $750: employer pays base rate on TW, plus a graduated amount on excess over $500. */
function graduated(baseRate: number, gradientTotal: number, gradientEmployee: number): IncomeBracket {
  return {
    maxIncome: 750,
    compute: (ow, aw) => {
      const tw = D(ow).plus(aw);
      const excess = tw.minus(500);
      return {
        total: D(baseRate).times(tw).plus(D(gradientTotal).times(excess)),
        employee: D(gradientEmployee).times(excess),
      };
    },
  };
}

/** TW > $750: full contribution rates on total wages. */
function full(totalRate: number, employeeRate: number): IncomeBracket {
  return {
    maxIncome: Infinity,
    compute: (ow, aw) => {
      const tw = D(ow).plus(aw);
      return { total: D(totalRate).times(tw), employee: D(employeeRate).times(tw) };
    },
  };
}

// ── Contribution tables ────────────────────────────────────────────

// Table 1: SC / SPR 3rd year onwards
const TABLE_1: AgeBracket[] = [
  { maxAge: 55,       incomeBrackets: [nil(), employerOnly(0.17),  graduated(0.17,  0.6,   0.6),   full(0.37,  0.20)]  },
  { maxAge: 60,       incomeBrackets: [nil(), employerOnly(0.16),  graduated(0.16,  0.54,  0.54),  full(0.34,  0.18)]  },
  { maxAge: 65,       incomeBrackets: [nil(), employerOnly(0.125), graduated(0.125, 0.375, 0.375), full(0.25,  0.125)] },
  { maxAge: 70,       incomeBrackets: [nil(), employerOnly(0.09),  graduated(0.09,  0.225, 0.225), full(0.165, 0.075)] },
  { maxAge: Infinity, incomeBrackets: [nil(), employerOnly(0.075), graduated(0.075, 0.15,  0.15),  full(0.125, 0.05)]  },
];

// Table 2: SPR 1st year, Graduated/Graduated
const TABLE_2: AgeBracket[] = [
  { maxAge: 55,       incomeBrackets: [nil(), employerOnly(0.04),  graduated(0.04,  0.15, 0.15), full(0.09,  0.05)] },
  { maxAge: 60,       incomeBrackets: [nil(), employerOnly(0.04),  graduated(0.04,  0.15, 0.15), full(0.09,  0.05)] },
  { maxAge: 65,       incomeBrackets: [nil(), employerOnly(0.035), graduated(0.035, 0.15, 0.15), full(0.085, 0.05)] },
  { maxAge: Infinity, incomeBrackets: [nil(), employerOnly(0.035), graduated(0.035, 0.15, 0.15), full(0.085, 0.05)] },
];

// Table 3: SPR 2nd year, Graduated/Graduated
const TABLE_3: AgeBracket[] = [
  { maxAge: 55,       incomeBrackets: [nil(), employerOnly(0.09),  graduated(0.09,  0.45,  0.45),  full(0.24,  0.15)]  },
  { maxAge: 60,       incomeBrackets: [nil(), employerOnly(0.06),  graduated(0.06,  0.375, 0.375), full(0.185, 0.125)] },
  { maxAge: 65,       incomeBrackets: [nil(), employerOnly(0.035), graduated(0.035, 0.225, 0.225), full(0.11,  0.075)] },
  { maxAge: Infinity, incomeBrackets: [nil(), employerOnly(0.035), graduated(0.035, 0.15,  0.15),  full(0.085, 0.05)]  },
];

// Table 4: SPR 1st year, Full employer / Graduated employee
const TABLE_4: AgeBracket[] = [
  { maxAge: 55,       incomeBrackets: [nil(), employerOnly(0.17),  graduated(0.17,  0.15, 0.15), full(0.22,  0.05)] },
  { maxAge: 60,       incomeBrackets: [nil(), employerOnly(0.16),  graduated(0.16,  0.15, 0.15), full(0.21,  0.05)] },
  { maxAge: 65,       incomeBrackets: [nil(), employerOnly(0.125), graduated(0.125, 0.15, 0.15), full(0.175, 0.05)] },
  { maxAge: 70,       incomeBrackets: [nil(), employerOnly(0.09),  graduated(0.09,  0.15, 0.15), full(0.14,  0.05)] },
  { maxAge: Infinity, incomeBrackets: [nil(), employerOnly(0.075), graduated(0.075, 0.15, 0.15), full(0.125, 0.05)] },
];

// Table 5: SPR 2nd year, Full employer / Graduated employee
const TABLE_5: AgeBracket[] = [
  { maxAge: 55,       incomeBrackets: [nil(), employerOnly(0.17),  graduated(0.17,  0.45,  0.45),  full(0.32,  0.15)]  },
  { maxAge: 60,       incomeBrackets: [nil(), employerOnly(0.16),  graduated(0.16,  0.375, 0.375), full(0.285, 0.125)] },
  { maxAge: 65,       incomeBrackets: [nil(), employerOnly(0.125), graduated(0.125, 0.225, 0.225), full(0.20,  0.075)] },
  { maxAge: 70,       incomeBrackets: [nil(), employerOnly(0.09),  graduated(0.09,  0.15,  0.15),  full(0.14,  0.05)]  },
  { maxAge: Infinity, incomeBrackets: [nil(), employerOnly(0.075), graduated(0.075, 0.15,  0.15),  full(0.125, 0.05)]  },
];

// ── Allocation table ───────────────────────────────────────────────

const ALLOCATIONS: AllocationBracket[] = [
  { maxAge: 35,       oaRatio: 0.6217, saOrRaRatio: 0.1621, maRatio: 0.2162 },
  { maxAge: 45,       oaRatio: 0.5677, saOrRaRatio: 0.1891, maRatio: 0.2432 },
  { maxAge: 50,       oaRatio: 0.5136, saOrRaRatio: 0.2162, maRatio: 0.2702 },
  { maxAge: 55,       oaRatio: 0.4055, saOrRaRatio: 0.3108, maRatio: 0.2837 },
  { maxAge: 60,       oaRatio: 0.353,  saOrRaRatio: 0.3382, maRatio: 0.3088 },
  { maxAge: 65,       oaRatio: 0.14,   saOrRaRatio: 0.44,   maRatio: 0.42 },
  { maxAge: 70,       oaRatio: 0.0607, saOrRaRatio: 0.303,  maRatio: 0.6363 },
  { maxAge: Infinity, oaRatio: 0.08,   saOrRaRatio: 0.08,   maRatio: 0.84 },
];

// ── Export ──────────────────────────────────────────────────────────

export const RATES_2026: YearRates = {
  contributions: {
    SC: TABLE_1,
    SPR_3: TABLE_1,
    SPR_1G: TABLE_2,
    SPR_2G: TABLE_3,
    SPR_1FG: TABLE_4,
    SPR_2FG: TABLE_5,
  },
  allocations: ALLOCATIONS,
};
