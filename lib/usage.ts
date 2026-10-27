export const HOME_SIZES = ["flat", "small-house", "medium-house", "large-house"] as const;
export type HomeSize = (typeof HOME_SIZES)[number];

export type UsageAnswers = {
  homeSize: HomeSize;
  occupants: number;
  hasElectricVehicle: boolean;
  hasHeatPump: boolean;
};

/**
 * Ofgem's typical domestic consumption values (TDCVs) for single-rate
 * electricity (Profile Class 1), in force from 1 July 2026. Source: Ofgem,
 * "Review of typical domestic consumption values: decision", 27 May 2026,
 * table 1. Check for a newer review before relying on these.
 */
export const OFGEM_TDCV_KWH = { low: 1600, medium: 2500, high: 3800 } as const;

/**
 * Starting points in kWh a year. Flat, medium and large house use Ofgem's
 * low, medium and high figures. Ofgem has no figure for a small house, so it
 * sits between low and medium: that one is our assumption.
 */
const BASE_KWH: Record<HomeSize, number> = {
  flat: OFGEM_TDCV_KWH.low,
  "small-house": 2000,
  "medium-house": OFGEM_TDCV_KWH.medium,
  "large-house": OFGEM_TDCV_KWH.high,
};

// The adjustments below are our own rough assumptions, not official figures.
// They make the estimate respond sensibly; a bill or smart meter is always better.

/** Each person above or below two shifts usage by roughly this much (assumption). */
const KWH_PER_EXTRA_OCCUPANT = 300;

/** About 7,000 miles a year at roughly 3.5 miles per kWh (assumption). */
const ELECTRIC_VEHICLE_KWH = 2000;

/** A heat pump heating an average home in place of gas (assumption). */
const HEAT_PUMP_KWH = 3500;

/** Sensible upper bound for one home. Above this is almost certainly a typo. */
export const MAX_ANNUAL_KWH = 50_000;

export const MIN_OCCUPANTS = 1;
export const MAX_OCCUPANTS = 8;

/**
 * Rough annual electricity use from a few friendly questions.
 * Always shown with an option to enter real kWh from a bill instead.
 */
export function estimateAnnualKwh(answers: UsageAnswers): number {
  if (
    !Number.isInteger(answers.occupants) ||
    answers.occupants < MIN_OCCUPANTS ||
    answers.occupants > MAX_OCCUPANTS
  ) {
    throw new RangeError(
      `occupants must be a whole number from ${MIN_OCCUPANTS} to ${MAX_OCCUPANTS}`,
    );
  }

  const kwh =
    BASE_KWH[answers.homeSize] +
    (answers.occupants - 2) * KWH_PER_EXTRA_OCCUPANT +
    (answers.hasElectricVehicle ? ELECTRIC_VEHICLE_KWH : 0) +
    (answers.hasHeatPump ? HEAT_PUMP_KWH : 0);

  // Round to the nearest 10 so the figure does not look falsely precise.
  return Math.round(kwh / 10) * 10;
}

const kwhFormatter = new Intl.NumberFormat("en-GB");

/** 2700 → "2,700 kWh" */
export function formatKwh(kwh: number): string {
  return `${kwhFormatter.format(kwh)} kWh`;
}
