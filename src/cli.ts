import { input, select, confirm } from '@inquirer/prompts';
import { computeContributions, computeAllocation } from './index.js';
import type { ResidencyStatus } from './types.js';

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString('en-SG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

async function run(): Promise<void> {
  console.log('\n\x1b[1m=== CPF Calculator (Jan 2026) ===\x1b[0m\n');

  const birthYear = parseInt(await input({ message: 'Birth year:' }), 10);
  const birthMonth = parseInt(await input({ message: 'Birth month (1–12):' }), 10);
  const contributionYear = parseInt(await input({ message: 'Contribution year:', default: String(new Date().getFullYear()) }), 10);
  const contributionMonth = parseInt(await input({ message: 'Contribution month (1–12):', default: String(new Date().getMonth() + 1) }), 10);
  const ow = parseFloat(await input({ message: 'Ordinary Wages ($/month):' }));
  const aw = parseFloat(await input({ message: 'Additional Wages ($):', default: '0' }));
  const owCsv = await input({
    message: 'OW for other months this year, excl. current month (comma-separated, or blank):',
    default: '',
  });
  const monthlyOrdinaryWages = owCsv
    ? owCsv.split(',').map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n))
    : [];
  const residencyStatus = await select<ResidencyStatus>({
    message: 'Residency status:',
    default: 'SC',
    choices: [
      { value: 'SC',     name: 'SC      — Singapore Citizen' },
      { value: 'SPR_3',  name: 'SPR_3   — SPR 3rd year onwards' },
      { value: 'SPR_1G', name: 'SPR_1G  — SPR 1st year, Graduated/Graduated' },
      { value: 'SPR_2G', name: 'SPR_2G  — SPR 2nd year, Graduated/Graduated' },
      { value: 'SPR_1FG',name: 'SPR_1FG — SPR 1st year, Full employer/Graduated employee' },
      { value: 'SPR_2FG',name: 'SPR_2FG — SPR 2nd year, Full employer/Graduated employee' },
    ],
  });

  const contributions = computeContributions({
    birthYear,
    birthMonth,
    ordinaryWages: ow,
    additionalWages: aw,
    residencyStatus,
    monthlyOrdinaryWages,
    contributionYear,
    contributionMonth,
  });

  const allocation = computeAllocation({
    birthYear,
    birthMonth,
    totalContribution: contributions.total,
    contributionYear,
    contributionMonth,
  });

  const { computeCpfAge } = await import('./utils.js');
  const cpfAge = computeCpfAge(birthYear, birthMonth, contributionYear, contributionMonth);

  console.log('\n\x1b[1m── Contributions ─────────────────────\x1b[0m');
  console.log(`  Employee:  $${fmt(contributions.employee)}`);
  console.log(`  Employer:  $${fmt(contributions.employer)}`);
  console.log(`  Total:     $${fmt(contributions.total)}`);

  console.log('\n\x1b[1m── Allocation ────────────────────────\x1b[0m');
  console.log(`  Ordinary Account:      $${fmt(allocation.ordinaryAccount, 2)}`);
  if (cpfAge <= 55) {
    console.log(`  Special Account:       $${fmt(allocation.specialAccount, 2)}`);
  } else {
    console.log(`  Retirement Account:    $${fmt(allocation.retirementAccount, 2)}`);
  }
  console.log(`  MediSave Account:      $${fmt(allocation.medisaveAccount, 2)}`);
  console.log();
}

async function main(): Promise<void> {
  try {
    do {
      await run();
    } while (await confirm({ message: 'Run again?', default: true }));
  } catch {
    // Ctrl+D or Ctrl+C — exit gracefully
    process.stdout.write('\n');
  }
}

main();
