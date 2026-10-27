/**
 * Money rules (see CLAUDE.md):
 * - Rates are fractional pence, kept as decimals exactly as received.
 * - Calculated totals are integer pence, rounded once at the end.
 * - Formatting happens only at the display edge.
 */

const poundsFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

const wholePoundsFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

/** Round a calculated total to whole pence. Call this once, at the end. */
export function toWholePence(pence: number): number {
  // Math.round sends -0.5 to -0, which would format as "-£0.00".
  return Math.round(pence) || 0;
}

/** 123456 → "£1,234.56" */
export function formatPounds(pence: number): string {
  if (!Number.isInteger(pence)) {
    throw new Error("formatPounds expects whole pence; round the total first");
  }
  return poundsFormatter.format(pence / 100);
}

/** 123456 → "£1,235" */
export function formatWholePounds(pence: number): string {
  return wholePoundsFormatter.format(Math.round(pence / 100));
}

/** 24.5 → "24.50p per kWh" */
export function formatUnitRate(pencePerKwh: number): string {
  return `${pencePerKwh.toFixed(2)}p per kWh`;
}

/** 41.3869 → "41.39p per day" */
export function formatStandingCharge(pencePerDay: number): string {
  return `${pencePerDay.toFixed(2)}p per day`;
}
