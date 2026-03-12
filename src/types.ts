import type Decimal from 'decimal.js';

export type ResidencyStatus =
  | 'SC'
  | 'SPR_3'
  | 'SPR_1G'
  | 'SPR_2G'
  | 'SPR_1FG'
  | 'SPR_2FG';

export interface ContributionOptions {
  birthYear: number;
  birthMonth: number;
  ordinaryWages: number;
  additionalWages?: number;
  residencyStatus?: ResidencyStatus;
  monthlyOrdinaryWages?: number[];
  contributionYear?: number;
  contributionMonth?: number;
}

export interface ContributionResult {
  employee: number;
  employer: number;
  total: number;
}

export interface RawContribution {
  total: Decimal;
  employee: Decimal;
}

export interface IncomeBracket {
  maxIncome: number;
  compute: (ow: number, aw: number) => RawContribution;
}

export interface AgeBracket {
  maxAge: number;
  incomeBrackets: IncomeBracket[];
}

export interface AllocationOptions {
  birthYear: number;
  birthMonth: number;
  totalContribution: number;
  contributionYear?: number;
  contributionMonth?: number;
}

export interface AllocationResult {
  ordinaryAccount: number;
  specialAccount: number;
  retirementAccount: number;
  medisaveAccount: number;
}

export interface AllocationBracket {
  maxAge: number;
  oaRatio: number;
  saOrRaRatio: number;
  maRatio: number;
}
