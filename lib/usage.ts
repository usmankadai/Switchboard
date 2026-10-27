export const HOME_SIZES = ["flat", "small-house", "medium-house", "large-house"] as const;
export type HomeSize = (typeof HOME_SIZES)[number];

export type UsageAnswers = {
  homeSize: HomeSize;
  occupants: number;
  hasElectricVehicle: boolean;
  hasHeatPump: boolean;
};

/**
 * Starting points in kWh a year. Anchored to Ofgem's typical domestic
 * consumption values for electricity (low 1,800, medium 2,700, high 4,100).
 */
const BASE_KWH: Record<HomeSize, number> = {
  flat: 1800,
  "small-house": 2300,
  "medium-house": 2700,
  "large-house": 3400,
};

/** Each person above or below two shifts usage by roughly this much. */
const KWH_PER_EXTRA_OCCUPANT = 300;

/** About 7,000 miles a year at roughly 3.5 miles per kWh. */
const ELECTRIC_VEHICLE_KWH = 2000;

/** A heat pump for an average home, replacing gas heating. */
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
