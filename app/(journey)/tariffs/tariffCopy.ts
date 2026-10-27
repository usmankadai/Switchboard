/**
 * Words about each kind of tariff, shared by the cards and the table so both
 * layouts in the A/B test say exactly the same thing. Only the layout differs.
 */

export type TariffKindName = "FLEXIBLE" | "FIXED" | "TRACKER" | "AGILE";

/** One line on what each kind of tariff means, without jargon. */
export const KIND_DESCRIPTIONS: Record<TariffKindName, string> = {
  FLEXIBLE: "A variable price that can go up or down, usually every 3 months.",
  FIXED: "Your unit rate and standing charge stay the same for the whole contract.",
  TRACKER: "The price changes each day, following wholesale energy costs.",
  AGILE: "The price changes every half hour. It is cheapest when demand is low, sometimes below zero.",
};

/**
 * What a customer needs before they can choose a tariff. Agile bills every
 * half hour, so it needs a smart meter that sends half-hourly readings
 * (Octopus's Agile help page and terms).
 */
export const REQUIREMENTS: Partial<Record<TariffKindName, string>> = {
  AGILE: "Needs a smart meter that sends half-hourly readings.",
};

export const CHEAPEST_LABEL = "Lowest estimated cost";
