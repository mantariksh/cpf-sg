export { registerRates, getRatesForYear } from './registry.js';
export type { YearRates } from './registry.js';

// Register built-in rate tables
import { registerRates } from './registry.js';
import { RATES_2026 } from './2026.js';

registerRates(2026, RATES_2026);
