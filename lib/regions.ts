/**
 * Electricity distribution regions (grid supply point groups). The letter
 * is the suffix on every regional tariff code, for example E-1R-AGILE-24-10-01-C.
 */
export const REGION_NAMES: Readonly<Record<string, string>> = {
  A: "Eastern England",
  B: "East Midlands",
  C: "London",
  D: "Merseyside and North Wales",
  E: "West Midlands",
  F: "North East England",
  G: "North West England",
  H: "Southern England",
  J: "South East England",
  K: "South Wales",
  L: "South West England",
  M: "Yorkshire",
  N: "South Scotland",
  P: "North Scotland",
};

/** "_C" (as the API returns it) → "C". Returns null for anything unknown. */
export function parseRegionCode(groupId: string): string | null {
  const code = groupId.replace(/^_/, "").toUpperCase();
  return code in REGION_NAMES ? code : null;
}

/** Single-rate electricity tariff code for a product in a region. */
export function electricityTariffCode(
  productCode: string,
  regionCode: string,
): string {
  return `E-1R-${productCode}-${regionCode}`;
}
