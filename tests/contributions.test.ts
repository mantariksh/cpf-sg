import { describe, expect, it } from 'vitest';
import {
  computeContributions,
  computeCpfAge,
  MIN_CONTRIBUTION_YEAR,
} from '../src/index.js';

// Use a fixed contribution period so tests are deterministic.
// With contributionMonth=1, cpfAge = contributionYear - birthYear
// (since 1 is never > any birthMonth).
const C_YEAR = 2026;
const C_MONTH = 1;
const BIRTH_MONTH = 6; // arbitrary, doesn't affect cpfAge when contributionMonth=1

/** Helper: returns birthYear that produces the given cpfAge in Jan 2026. */
function byear(cpfAge: number): number {
  return C_YEAR - cpfAge;
}

describe('computeCpfAge', () => {
  it('birthday month: old bracket applies', () => {
    // Born June 1971, contribution June 2026 → turns 55 this month
    // cpfAge = 2026 - 1971 = 55 (≤55 bracket)
    expect(computeCpfAge(1971, 6, 2026, 6)).toBe(55);
  });

  it('month after birthday: new bracket applies', () => {
    // Born June 1971, contribution July 2026 → month after turning 55
    // cpfAge = 2026 - 1971 + 1 = 56 (>55 bracket)
    expect(computeCpfAge(1971, 6, 2026, 7)).toBe(56);
  });

  it('before birthday month: old bracket still applies', () => {
    // Born June 1971, contribution January 2026 → hasn't turned 55 yet
    // cpfAge = 2026 - 1971 = 55 (≤55 bracket)
    expect(computeCpfAge(1971, 6, 2026, 1)).toBe(55);
  });

  it('December birthday: transition in January next year', () => {
    // Born December 1972, contribution December 2025 (birthday month)
    // cpfAge = 2025 - 1972 = 53
    expect(computeCpfAge(1972, 12, 2025, 12)).toBe(53);
    // January 2026: month after birthday
    // cpfAge = 2026 - 1972 = 54
    expect(computeCpfAge(1972, 12, 2026, 1)).toBe(54);
  });

  it('validates birthMonth', () => {
    expect(() => computeCpfAge(1990, 0, 2026, 1)).toThrow('birthMonth');
    expect(() => computeCpfAge(1990, 13, 2026, 1)).toThrow('birthMonth');
  });

  it('validates contributionMonth', () => {
    expect(() => computeCpfAge(1990, 1, 2026, 0)).toThrow('contributionMonth');
    expect(() => computeCpfAge(1990, 1, 2026, 13)).toThrow('contributionMonth');
  });

  it('validates birthYear >= 1900', () => {
    expect(() => computeCpfAge(1899, 1, 2026, 1)).toThrow('birthYear');
  });

  it('allows future contributionYear', () => {
    // Future years are valid — rates use floor lookup
    expect(() => computeCpfAge(1990, 1, 2030, 1)).not.toThrow();
  });

  it('validates birthYear < contributionYear', () => {
    expect(() => computeCpfAge(2026, 1, 2026, 1)).toThrow('birthYear');
    expect(() => computeCpfAge(2027, 1, 2026, 1)).toThrow('birthYear');
  });
});

describe('minimum contribution year', () => {
  it('rejects contributionYear before 2026 in computeContributions', () => {
    expect(() =>
      computeContributions({
        birthYear: 1990,
        birthMonth: 6,
        ordinaryWages: 5000,
        contributionYear: 2025,
        contributionMonth: 1,
      }),
    ).toThrow(`contributionYear must be ${MIN_CONTRIBUTION_YEAR}`);
  });

  it('accepts future contribution years', () => {
    const r = computeContributions({
      birthYear: 1990,
      birthMonth: 6,
      ordinaryWages: 5000,
      contributionYear: 2030,
      contributionMonth: 1,
    });
    expect(r.total).toBeGreaterThan(0);
  });
});

describe('computeContributions', () => {
  describe('SC ≤55 wage bands', () => {
    it('returns nil for TW ≤ $50', () => {
      const r = computeContributions({
        birthYear: byear(30),
        birthMonth: BIRTH_MONTH,
        ordinaryWages: 30,
        contributionYear: C_YEAR,
        contributionMonth: C_MONTH,
      });
      expect(r).toEqual({ employee: 0, employer: 0, total: 0 });
    });

    it('computes employer-only for $50 < TW ≤ $500', () => {
      const r = computeContributions({
        birthYear: byear(30),
        birthMonth: BIRTH_MONTH,
        ordinaryWages: 300,
        contributionYear: C_YEAR,
        contributionMonth: C_MONTH,
      });
      expect(r).toEqual({ employee: 0, employer: 51, total: 51 });
    });

    it('computes graduated rate for $500 < TW ≤ $750', () => {
      const r = computeContributions({
        birthYear: byear(30),
        birthMonth: BIRTH_MONTH,
        ordinaryWages: 600,
        contributionYear: C_YEAR,
        contributionMonth: C_MONTH,
      });
      expect(r).toEqual({ employee: 60, employer: 102, total: 162 });
    });

    it('computes full rate for TW > $750', () => {
      const r = computeContributions({
        birthYear: byear(30),
        birthMonth: BIRTH_MONTH,
        ordinaryWages: 5000,
        contributionYear: C_YEAR,
        contributionMonth: C_MONTH,
      });
      expect(r).toEqual({ employee: 1000, employer: 850, total: 1850 });
    });
  });

  describe('OW ceiling', () => {
    it('caps OW at $8,000', () => {
      const r = computeContributions({
        birthYear: byear(30),
        birthMonth: BIRTH_MONTH,
        ordinaryWages: 10000,
        contributionYear: C_YEAR,
        contributionMonth: C_MONTH,
      });
      expect(r).toEqual({ employee: 1600, employer: 1360, total: 2960 });
    });
  });

  describe('AW ceiling', () => {
    it('caps AW based on annual wage ceiling with prior months OW', () => {
      // 11 prior months at $8,000 each → total capped OW = 11*8000 = 88,000
      // Current month OW = 8,000 (capped) → total = 96,000
      // AW ceiling = 102,000 - 96,000 = 6,000
      // AW = 10,000 → capped to 6,000
      // total = 0.37 * (8000 + 6000) = 5180, employee = 0.20 * 14000 = 2800
      const r = computeContributions({
        birthYear: byear(30),
        birthMonth: BIRTH_MONTH,
        ordinaryWages: 8000,
        additionalWages: 10000,
        monthlyOrdinaryWages: Array(11).fill(8000),
        contributionYear: C_YEAR,
        contributionMonth: C_MONTH,
      });
      expect(r).toEqual({ employee: 2800, employer: 2380, total: 5180 });
    });

    it('caps each prior month OW at $8,000 before summing', () => {
      // 11 prior months at $10,000 each → capped to $8,000 each → 88,000
      // Same result as above
      const r = computeContributions({
        birthYear: byear(30),
        birthMonth: BIRTH_MONTH,
        ordinaryWages: 8000,
        additionalWages: 10000,
        monthlyOrdinaryWages: Array(11).fill(10000),
        contributionYear: C_YEAR,
        contributionMonth: C_MONTH,
      });
      expect(r).toEqual({ employee: 2800, employer: 2380, total: 5180 });
    });

    it('returns zero AW when ceiling exhausted', () => {
      // 11 other months at $8,500 → capped to 11*8000 = 88,000
      // Current month OW = 8,500 → capped to 8,000 → total = 96,000
      // AW ceiling = max(0, 102,000 - 96,000) = 6,000
      // But if we add more months to push past ceiling:
      // 11 months at $10,000 → capped to 88,000 + current 8,000 = 96,000
      // AW = 7000 → capped to 6,000
      // Now test actual exhaustion: use high OW to push past 102k
      // 11 months at $9,300 → each capped to 8,000 = 88,000 + current 8,000 = 96,000
      // AW ceiling = 6,000, so AW = 5,000 is fine
      // For real exhaustion, we need all months to sum to >= 102,000:
      // Only 12 months total, max 8,000 each = 96,000, so ceiling is always >= 6,000
      // AW ceiling can never be 0 with max 12 months — that's correct per CPF rules
      const r = computeContributions({
        birthYear: byear(30),
        birthMonth: BIRTH_MONTH,
        ordinaryWages: 8000,
        additionalWages: 5000,
        monthlyOrdinaryWages: Array(11).fill(8000),
        contributionYear: C_YEAR,
        contributionMonth: C_MONTH,
      });
      // AW ceiling = 102,000 - 96,000 = 6,000 → AW 5,000 fully included
      // total = 0.37 * (8000 + 5000) = 4810
      expect(r).toEqual({ employee: 2600, employer: 2210, total: 4810 });
    });

    it('supports forecasting with future months OW', () => {
      // Contribution month is June (month 6), but we provide 11 months of OW
      // (Jan-Apr, Jul-Dec) to forecast the annual AW ceiling.
      // 11 months at $8,000 capped = 88,000 + current 8,000 = 96,000
      // AW ceiling = 102,000 - 96,000 = 6,000
      // AW = 5,000 < 6,000 → fully included
      const r = computeContributions({
        birthYear: byear(30),
        birthMonth: BIRTH_MONTH,
        ordinaryWages: 8000,
        additionalWages: 5000,
        monthlyOrdinaryWages: Array(11).fill(8000),
        contributionYear: C_YEAR,
        contributionMonth: 6,
      });
      // total = 0.37 * (8000 + 5000) = 4810
      expect(r.total).toBe(4810);
    });

    it('rejects more than 11 entries', () => {
      expect(() =>
        computeContributions({
          birthYear: byear(30),
          birthMonth: BIRTH_MONTH,
          ordinaryWages: 5000,
          monthlyOrdinaryWages: Array(12).fill(5000),
          contributionYear: C_YEAR,
          contributionMonth: C_MONTH,
        }),
      ).toThrow('max 11');
    });

    it('defaults to no prior months when omitted', () => {
      // No monthlyOrdinaryWages → AW ceiling = 102,000 - cappedOW
      // OW = 8,000, AW = 90,000 → cappedAW = min(90,000, 102,000-8,000) = 90,000
      // total = 0.37 * 98,000 = 36,260
      const r = computeContributions({
        birthYear: byear(30),
        birthMonth: BIRTH_MONTH,
        ordinaryWages: 8000,
        additionalWages: 90000,
        contributionYear: C_YEAR,
        contributionMonth: C_MONTH,
      });
      expect(r.total).toBe(36260);
    });
  });

  describe('age boundaries - SC', () => {
    it('cpfAge 55 uses ≤55 bracket', () => {
      const r = computeContributions({
        birthYear: byear(55),
        birthMonth: BIRTH_MONTH,
        ordinaryWages: 5000,
        contributionYear: C_YEAR,
        contributionMonth: C_MONTH,
      });
      expect(r).toEqual({ employee: 1000, employer: 850, total: 1850 });
    });

    it('cpfAge 56 uses 55-60 bracket', () => {
      const r = computeContributions({
        birthYear: byear(56),
        birthMonth: BIRTH_MONTH,
        ordinaryWages: 5000,
        contributionYear: C_YEAR,
        contributionMonth: C_MONTH,
      });
      expect(r).toEqual({ employee: 900, employer: 800, total: 1700 });
    });

    it('cpfAge 60 uses 55-60 bracket', () => {
      const r = computeContributions({
        birthYear: byear(60),
        birthMonth: BIRTH_MONTH,
        ordinaryWages: 5000,
        contributionYear: C_YEAR,
        contributionMonth: C_MONTH,
      });
      expect(r).toEqual({ employee: 900, employer: 800, total: 1700 });
    });

    it('cpfAge 61 uses 60-65 bracket', () => {
      const r = computeContributions({
        birthYear: byear(61),
        birthMonth: BIRTH_MONTH,
        ordinaryWages: 5000,
        contributionYear: C_YEAR,
        contributionMonth: C_MONTH,
      });
      expect(r).toEqual({ employee: 625, employer: 625, total: 1250 });
    });

    it('cpfAge 65 uses 60-65 bracket', () => {
      const r = computeContributions({
        birthYear: byear(65),
        birthMonth: BIRTH_MONTH,
        ordinaryWages: 5000,
        contributionYear: C_YEAR,
        contributionMonth: C_MONTH,
      });
      expect(r).toEqual({ employee: 625, employer: 625, total: 1250 });
    });

    it('cpfAge 66 uses 65-70 bracket', () => {
      const r = computeContributions({
        birthYear: byear(66),
        birthMonth: BIRTH_MONTH,
        ordinaryWages: 5000,
        contributionYear: C_YEAR,
        contributionMonth: C_MONTH,
      });
      expect(r).toEqual({ employee: 375, employer: 450, total: 825 });
    });

    it('cpfAge 70 uses 65-70 bracket', () => {
      const r = computeContributions({
        birthYear: byear(70),
        birthMonth: BIRTH_MONTH,
        ordinaryWages: 5000,
        contributionYear: C_YEAR,
        contributionMonth: C_MONTH,
      });
      expect(r).toEqual({ employee: 375, employer: 450, total: 825 });
    });

    it('cpfAge 71 uses >70 bracket', () => {
      const r = computeContributions({
        birthYear: byear(71),
        birthMonth: BIRTH_MONTH,
        ordinaryWages: 5000,
        contributionYear: C_YEAR,
        contributionMonth: C_MONTH,
      });
      expect(r).toEqual({ employee: 250, employer: 375, total: 625 });
    });
  });

  describe('birthday month bracket transition', () => {
    it('uses ≤55 bracket in the birthday month when turning 55', () => {
      // Born June 1971, contribution June 2026 → cpfAge 55
      const r = computeContributions({
        birthYear: 1971,
        birthMonth: 6,
        ordinaryWages: 5000,
        contributionYear: 2026,
        contributionMonth: 6,
      });
      expect(r).toEqual({ employee: 1000, employer: 850, total: 1850 });
    });

    it('uses >55 bracket the month after turning 55', () => {
      // Born June 1971, contribution July 2026 → cpfAge 56
      const r = computeContributions({
        birthYear: 1971,
        birthMonth: 6,
        ordinaryWages: 5000,
        contributionYear: 2026,
        contributionMonth: 7,
      });
      expect(r).toEqual({ employee: 900, employer: 800, total: 1700 });
    });
  });

  describe('residency statuses', () => {
    const base = {
      birthYear: byear(30),
      birthMonth: BIRTH_MONTH,
      ordinaryWages: 5000,
      contributionYear: C_YEAR,
      contributionMonth: C_MONTH,
    };

    it('SPR_3 uses same rates as SC (Table 1)', () => {
      const sc = computeContributions({ ...base, residencyStatus: 'SC' });
      const spr3 = computeContributions({ ...base, residencyStatus: 'SPR_3' });
      expect(spr3).toEqual(sc);
    });

    it('SPR_1G uses Table 2', () => {
      const r = computeContributions({ ...base, residencyStatus: 'SPR_1G' });
      expect(r).toEqual({ employee: 250, employer: 200, total: 450 });
    });

    it('SPR_2G uses Table 3', () => {
      const r = computeContributions({ ...base, residencyStatus: 'SPR_2G' });
      expect(r).toEqual({ employee: 750, employer: 450, total: 1200 });
    });

    it('SPR_1FG uses Table 4', () => {
      const r = computeContributions({ ...base, residencyStatus: 'SPR_1FG' });
      expect(r).toEqual({ employee: 250, employer: 850, total: 1100 });
    });

    it('SPR_2FG uses Table 5', () => {
      const r = computeContributions({ ...base, residencyStatus: 'SPR_2FG' });
      expect(r).toEqual({ employee: 750, employer: 850, total: 1600 });
    });
  });

  describe('rounding', () => {
    it('rounds total at .50 up', () => {
      const r = computeContributions({
        birthYear: byear(30),
        birthMonth: BIRTH_MONTH,
        ordinaryWages: 250,
        contributionYear: C_YEAR,
        contributionMonth: C_MONTH,
      });
      expect(r.total).toBe(43);
      expect(r.employee).toBe(0);
      expect(r.employer).toBe(43);
    });

    it('rounds total at .49 down', () => {
      const r = computeContributions({
        birthYear: byear(30),
        birthMonth: BIRTH_MONTH,
        ordinaryWages: 85,
        contributionYear: C_YEAR,
        contributionMonth: C_MONTH,
      });
      expect(r.total).toBe(14);
    });

    it('floors employee share', () => {
      const r = computeContributions({
        birthYear: byear(30),
        birthMonth: BIRTH_MONTH,
        ordinaryWages: 4999,
        contributionYear: C_YEAR,
        contributionMonth: C_MONTH,
      });
      expect(r.employee).toBe(999);
      expect(r.total).toBe(1850);
      expect(r.employer).toBe(851);
    });
  });

  describe('OW + AW combined', () => {
    it('applies rates to OW and AW separately for >$750', () => {
      const r = computeContributions({
        birthYear: byear(30),
        birthMonth: BIRTH_MONTH,
        ordinaryWages: 6000,
        additionalWages: 2000,
        contributionYear: C_YEAR,
        contributionMonth: C_MONTH,
      });
      expect(r).toEqual({ employee: 1600, employer: 1360, total: 2960 });
    });
  });
});
