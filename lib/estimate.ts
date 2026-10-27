import { toWholePence } from "./money";
import { averageByTimeOfDay, type TimeOfDayPrice } from "./time-of-day";
import { DOMESTIC_PROFILE, londonSlotIndex } from "./usage-profile";

export const DAYS_PER_YEAR = 365;

export type HalfHourlyPrice = {
  validFrom: string;
  /** Pence per kWh, inc VAT. Can be negative on Agile. */
  pencePerKwh: number;
};

/**
 * Estimated annual cost in whole pence for a single unit rate.
 * Rates stay fractional through the sum and are rounded once at the end.
 */
export function estimateAnnualCostPence({
  unitRatePence,
  standingChargePencePerDay,
  annualKwh,
}: {
  unitRatePence: number;
  standingChargePencePerDay: number;
  annualKwh: number;
}): number {
  if (annualKwh < 0) throw new RangeError("annualKwh cannot be negative");
  return toWholePence(
    unitRatePence * annualKwh + standingChargePencePerDay * DAYS_PER_YEAR,
  );
}

/**
 * Usage-weighted average unit rate for half-hourly tariffs (Agile, Tracker).
 *
 * Each half-hour price is weighted by how much a typical home uses in that
 * slot, so cheap overnight prices count for less than the evening peak.
 * Returns null when there are no prices to average.
 */
export function usageWeightedAverageRate(
  prices: readonly HalfHourlyPrice[],
  profile: readonly number[] = DOMESTIC_PROFILE,
): number | null {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const price of prices) {
    const weight = profile[londonSlotIndex(new Date(price.validFrom))] ?? 0;
    weightedSum += price.pencePerKwh * weight;
    totalWeight += weight;
  }

  return totalWeight === 0 ? null : weightedSum / totalWeight;
}

export type PriceSummary = {
  averagePence: number;
  minPence: number;
  maxPence: number;
  /** How many distinct UK days the prices cover. */
  days: number;
  /** Average price for each half hour of the day, for the time-of-day chart. */
  byTimeOfDay: TimeOfDayPrice[];
};

/** Plain min, max and usage-weighted average for the "is Agile right for you?" explainer. */
export function summarisePrices(
  prices: readonly HalfHourlyPrice[],
): PriceSummary | null {
  const average = usageWeightedAverageRate(prices);
  if (average === null) return null;

  const values = prices.map((price) => price.pencePerKwh);
  const days = new Set(
    prices.map((price) =>
      new Date(price.validFrom).toLocaleDateString("en-GB", {
        timeZone: "Europe/London",
      }),
    ),
  ).size;

  return {
    averagePence: average,
    minPence: Math.min(...values),
    maxPence: Math.max(...values),
    days,
    byTimeOfDay: averageByTimeOfDay(prices),
  };
}
