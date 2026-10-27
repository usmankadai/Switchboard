/**
 * Loose UK postcode format check, used before calling postcodes.io so we
 * can give instant feedback. postcodes.io is the source of truth.
 */
const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/;

/** " sw1a1aa " → "SW1A 1AA". Returns null when the format is wrong. */
export function normalisePostcode(input: string): string | null {
  const compact = input.replace(/\s+/g, "").toUpperCase();
  if (!UK_POSTCODE.test(compact)) return null;
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}
