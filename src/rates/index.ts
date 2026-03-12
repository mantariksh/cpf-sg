export type { YearRates } from './registry.js';
export { getRatesForYear, registerRates } from './registry.js';

import { RATES_2026 } from './2026.js';
// Register built-in rate tables
import { registerRates } from './registry.js';

registerRates(2026, RATES_2026);
