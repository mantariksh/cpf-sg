# cpf-sg

Singapore CPF (Central Provident Fund) contribution calculator. ESM-only.

Rate tables are built-in starting from **January 2026**. The `contributionYear` must be 2026 or later — historical rates are not supported. When CPF publishes new rates in the future, they will be added as a new version entry; the 2026 rates will continue to work for any year until superseded.

## Install

```
npm install cpf-sg
```

## Usage

```js
import {
  computeContributions,
  computeAllocation,
  computeCpfAge,
} from 'cpf-sg';

// Compute CPF contributions for an employee born June 1996, for January 2026
const contributions = computeContributions({
  birthYear: 1996,
  birthMonth: 6,
  ordinaryWages: 5000,
  contributionYear: 2026,
  contributionMonth: 1,
});
// { employee: 1000, employer: 850, total: 1850 }

// Year-end bonus with prior months' OW for accurate AW ceiling
const withBonus = computeContributions({
  birthYear: 1996,
  birthMonth: 6,
  ordinaryWages: 5000,
  additionalWages: 10000,
  monthlyOrdinaryWages: [5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000],
  contributionYear: 2026,
  contributionMonth: 12,
});

// Allocate contributions across CPF accounts
const allocation = computeAllocation({
  birthYear: 1996,
  birthMonth: 6,
  totalContribution: 1850,
  contributionYear: 2026,
  contributionMonth: 1,
});
// { ordinaryAccount: 1149.15, specialAccount: 299.89, retirementAccount: 0, medisaveAccount: 400.96 }

// Compute the CPF effective age directly
const cpfAge = computeCpfAge(1996, 6, 2026, 1); // 30
```

## Age Calculation

CPF uses a specific rule for age bracket transitions: **the new bracket applies from the first day of the month after the birthday month.** All functions accept `birthYear` and `birthMonth` instead of a raw age, and compute the correct bracket internally.

For example, an employee born in June 1971 turning 55 in June 2026:
- **June 2026** (birthday month): uses the **≤55** bracket
- **July 2026** (month after): uses the **>55–60** bracket

`contributionYear` and `contributionMonth` default to the current date if omitted. `contributionYear` must be **2026 or later**.

## Additional Wage (AW) Ceiling

The AW ceiling is `$102,000 − total OW subject to CPF for the year`. Since each month's OW is capped at $8,000 before it counts toward this total, the function needs the raw monthly OW figures to apply the cap correctly.

Pass `monthlyOrdinaryWages` — an array of up to **11** entries representing the other months' OW for the calendar year (excluding the current month, whose OW is already provided via `ordinaryWages`). Each entry is capped at $8,000 internally, then summed along with the current month's capped OW to determine the AW ceiling.

```js
// Employee earning $10,000/month — the $8,000 OW ceiling is applied per month.
// December contribution with 11 other months (Jan–Nov):
computeContributions({
  birthYear: 1996,
  birthMonth: 6,
  ordinaryWages: 10000,       // December OW (capped to $8,000 internally)
  additionalWages: 15000,     // year-end bonus
  monthlyOrdinaryWages: Array(11).fill(10000), // Jan–Nov OW (each capped to $8,000)
  contributionYear: 2026,
  contributionMonth: 12,
});
// Total OW subject to CPF = 12 × $8,000 = $96,000
// AW ceiling = $102,000 − $96,000 = $6,000
// → additionalWages capped from $15,000 to $6,000
```

The array can include **future months** for forecasting. For example, to estimate the annual AW ceiling from January, provide projected OW for the other 11 months (Feb–Dec):

```js
// Forecasting from January: how much AW room will there be this year?
computeContributions({
  birthYear: 1996,
  birthMonth: 6,
  ordinaryWages: 8000,
  additionalWages: 20000,
  monthlyOrdinaryWages: Array(11).fill(8000), // projected Feb–Dec
  contributionYear: 2026,
  contributionMonth: 1,
});
// Total OW subject to CPF = 12 × $8,000 = $96,000
// AW ceiling = $102,000 − $96,000 = $6,000
```

If omitted, only the current month's OW is counted, giving the maximum possible AW ceiling. This is suitable when no other OW has been or will be paid in the year.

## API

### `computeContributions(options): ContributionResult`

| Option | Type | Default | Description |
|---|---|---|---|
| `birthYear` | `number` | required | Employee's birth year |
| `birthMonth` | `number` | required | Employee's birth month (1–12) |
| `ordinaryWages` | `number` | required | Monthly ordinary wages (capped at $8,000 internally) |
| `additionalWages` | `number` | `0` | Additional wages (bonus, etc.) |
| `residencyStatus` | `ResidencyStatus` | `'SC'` | See residency statuses below |
| `monthlyOrdinaryWages` | `number[]` | `[]` | Other months' OW for the year, excl. current month (up to 11; each capped at $8,000 internally) |
| `contributionYear` | `number` | current year | Year of the contribution month (≥ 2026) |
| `contributionMonth` | `number` | current month | Month of the contribution (1–12) |

Returns `{ employee, employer, total }` — all in whole dollars after CPF rounding rules.

### `computeAllocation(options): AllocationResult`

| Option | Type | Default | Description |
|---|---|---|---|
| `birthYear` | `number` | required | Employee's birth year |
| `birthMonth` | `number` | required | Employee's birth month (1–12) |
| `totalContribution` | `number` | required | Total CPF contribution amount |
| `contributionYear` | `number` | current year | Year of the contribution month (≥ 2026) |
| `contributionMonth` | `number` | current month | Month of the contribution (1–12) |

Returns `{ ordinaryAccount, specialAccount, retirementAccount, medisaveAccount }` — amounts in dollars and cents.

### `computeCpfAge(birthYear, birthMonth, contributionYear, contributionMonth)`

Returns the CPF effective age for bracket lookup. Useful if you need the age value directly.

### Residency Statuses

| Value | Description |
|---|---|
| `'SC'` | Singapore Citizen (Table 1) |
| `'SPR_3'` | SPR, 3rd year onwards (Table 1) |
| `'SPR_1G'` | SPR 1st year, Graduated/Graduated (Table 2) |
| `'SPR_2G'` | SPR 2nd year, Graduated/Graduated (Table 3) |
| `'SPR_1FG'` | SPR 1st year, Full employer/Graduated employee (Table 4) |
| `'SPR_2FG'` | SPR 2nd year, Full employer/Graduated employee (Table 5) |

## Source References

- [CPF Contribution Rates (Jan 2026)](https://www.cpf.gov.sg/content/dam/web/employer/employer-obligations/documents/CPFcontributionratesfrom1Jan2026.pdf)
- [CPF Allocation Rates (Jan 2026)](https://www.cpf.gov.sg/content/dam/web/employer/employer-obligations/documents/CPFAllocationRatesfromJanuary2026.pdf)
- [What Payments Attract CPF Contributions](https://www.cpf.gov.sg/employer/employer-obligations/what-payments-attract-cpf-contributions)
- [How CPF Contributions Are Allocated](https://www.cpf.gov.sg/service/article/how-are-my-cpf-contributions-allocated-to-my-cpf-accounts) (age calculation rule)

## License

ISC
