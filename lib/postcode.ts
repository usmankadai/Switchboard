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

export const POSTCODE_MESSAGES = {
  empty: "Enter your postcode",
  invalid: "Enter a full UK postcode, like SW1A 1AA",
} as const;

export type PostcodeCheck =
  | { ok: true; postcode: string }
  | { ok: false; message: string };

/** Instant, offline check before asking the server. */
export function checkPostcodeInput(input: string): PostcodeCheck {
  if (input.trim() === "") return { ok: false, message: POSTCODE_MESSAGES.empty };
  const postcode = normalisePostcode(input);
  return postcode
    ? { ok: true, postcode }
    : { ok: false, message: POSTCODE_MESSAGES.invalid };
}
