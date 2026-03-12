import { describe, expect, it } from 'vitest';
import { computeAllocation } from '../src/index.js';

// Fixed contribution period. With contributionMonth=1, cpfAge = 2026 - birthYear.
const C_YEAR = 2026;
const C_MONTH = 1;
const BIRTH_MONTH = 6;

function byear(cpfAge: number): number {
  return C_YEAR - cpfAge;
}

const base = {
  birthMonth: BIRTH_MONTH,
  contributionYear: C_YEAR,
  contributionMonth: C_MONTH,
};

describe('minimum contribution year', () => {
  it('rejects contributionYear before 2026', () => {
    expect(() =>
      computeAllocation({
        birthYear: 1990,
        birthMonth: 6,
        totalContribution: 1000,
        contributionYear: 2025,
        contributionMonth: 1,
      }),
    ).toThrow('contributionYear must be 2026');
  });
});

describe('computeAllocation', () => {
  it('30yo, $100 contribution (CPF example 1)', () => {
    const r = computeAllocation({
      birthYear: byear(30),
      ...base,
      totalContribution: 100,
    });
    expect(r.medisaveAccount).toBe(21.62);
    expect(r.specialAccount).toBe(16.21);
    expect(r.ordinaryAccount).toBe(62.17);
    expect(r.retirementAccount).toBe(0);
  });

  it('57yo, $100 contribution (CPF example 2)', () => {
    const r = computeAllocation({
      birthYear: byear(57),
      ...base,
      totalContribution: 100,
    });
    expect(r.medisaveAccount).toBe(30.88);
    expect(r.retirementAccount).toBe(33.82);
    expect(r.ordinaryAccount).toBe(35.3);
    expect(r.specialAccount).toBe(0);
  });

  describe('all age brackets', () => {
    it('≤35 bracket', () => {
      const r = computeAllocation({
        birthYear: byear(25),
        ...base,
        totalContribution: 1000,
      });
      expect(r.medisaveAccount).toBe(216.2);
      expect(r.specialAccount).toBe(162.1);
      expect(r.ordinaryAccount).toBe(621.7);
      expect(r.retirementAccount).toBe(0);
    });

    it('35-45 bracket', () => {
      const r = computeAllocation({
        birthYear: byear(40),
        ...base,
        totalContribution: 1000,
      });
      expect(r.medisaveAccount).toBe(243.2);
      expect(r.specialAccount).toBe(189.1);
      expect(r.ordinaryAccount).toBe(567.7);
      expect(r.retirementAccount).toBe(0);
    });

    it('45-50 bracket', () => {
      const r = computeAllocation({
        birthYear: byear(48),
        ...base,
        totalContribution: 1000,
      });
      expect(r.medisaveAccount).toBe(270.2);
      expect(r.specialAccount).toBe(216.2);
      expect(r.ordinaryAccount).toBe(513.6);
      expect(r.retirementAccount).toBe(0);
    });

    it('50-55 bracket', () => {
      const r = computeAllocation({
        birthYear: byear(52),
        ...base,
        totalContribution: 1000,
      });
      expect(r.medisaveAccount).toBe(283.7);
      expect(r.specialAccount).toBe(310.8);
      expect(r.ordinaryAccount).toBe(405.5);
      expect(r.retirementAccount).toBe(0);
    });

    it('55-60 bracket', () => {
      const r = computeAllocation({
        birthYear: byear(58),
        ...base,
        totalContribution: 1000,
      });
      expect(r.medisaveAccount).toBe(308.8);
      expect(r.retirementAccount).toBe(338.2);
      expect(r.ordinaryAccount).toBe(353.0);
      expect(r.specialAccount).toBe(0);
    });

    it('60-65 bracket', () => {
      const r = computeAllocation({
        birthYear: byear(62),
        ...base,
        totalContribution: 1000,
      });
      expect(r.medisaveAccount).toBe(420.0);
      expect(r.retirementAccount).toBe(440.0);
      expect(r.ordinaryAccount).toBe(140.0);
      expect(r.specialAccount).toBe(0);
    });

    it('65-70 bracket', () => {
      const r = computeAllocation({
        birthYear: byear(68),
        ...base,
        totalContribution: 1000,
      });
      expect(r.medisaveAccount).toBe(636.3);
      expect(r.retirementAccount).toBe(303.0);
      expect(r.ordinaryAccount).toBe(60.7);
      expect(r.specialAccount).toBe(0);
    });

    it('>70 bracket', () => {
      const r = computeAllocation({
        birthYear: byear(75),
        ...base,
        totalContribution: 1000,
      });
      expect(r.medisaveAccount).toBe(840.0);
      expect(r.retirementAccount).toBe(80.0);
      expect(r.ordinaryAccount).toBe(80.0);
      expect(r.specialAccount).toBe(0);
    });
  });

  it('truncates SA sub-cent residuals (not rounds)', () => {
    const r = computeAllocation({
      birthYear: byear(30),
      ...base,
      totalContribution: 2960,
    });
    expect(r.specialAccount).toBe(479.81);
    expect(r.medisaveAccount).toBe(639.95);
    expect(r.ordinaryAccount).toBe(1840.24);
  });

  it('OA + SA/RA + MA equals totalContribution', () => {
    const ages = [25, 40, 48, 52, 58, 62, 68, 75];
    for (const cpfAge of ages) {
      const r = computeAllocation({
        birthYear: byear(cpfAge),
        ...base,
        totalContribution: 1234.56,
      });
      const sum =
        r.ordinaryAccount +
        r.specialAccount +
        r.retirementAccount +
        r.medisaveAccount;
      expect(Math.abs(sum - 1234.56)).toBeLessThan(0.02);
    }
  });

  describe('birthday month bracket transition', () => {
    it('uses ≤35 allocation in the birthday month when turning 35', () => {
      // Born March 1991, contribution March 2026 → cpfAge 35 → ≤35 bracket
      const r = computeAllocation({
        birthYear: 1991,
        birthMonth: 3,
        totalContribution: 100,
        contributionYear: 2026,
        contributionMonth: 3,
      });
      expect(r.specialAccount).toBe(16.21); // ≤35 SA ratio
    });

    it('uses >35 allocation the month after turning 35', () => {
      // Born March 1991, contribution April 2026 → cpfAge 36 → >35-45 bracket
      const r = computeAllocation({
        birthYear: 1991,
        birthMonth: 3,
        totalContribution: 100,
        contributionYear: 2026,
        contributionMonth: 4,
      });
      expect(r.specialAccount).toBe(18.91); // >35-45 SA ratio
    });
  });
});
