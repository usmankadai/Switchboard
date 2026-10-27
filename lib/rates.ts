/** A unit rate or standing charge record, mapped from the Octopus API. */
export type RateRecord = {
  /** Pence, inc VAT, exactly as received (often fractional). */
  valueIncVat: number;
  validFrom: string;
  /** null means the rate has no end date yet. */
  validTo: string | null;
  /** null means the rate applies to every payment method. */
  paymentMethod: string | null;
};

const isDirectDebitOrAll = (record: RateRecord) =>
  record.paymentMethod === null || record.paymentMethod === "DIRECT_DEBIT";

function isActiveAt(record: RateRecord, at: Date): boolean {
  const from = Date.parse(record.validFrom);
  const to = record.validTo === null ? Infinity : Date.parse(record.validTo);
  const time = at.getTime();
  return from <= time && time < to;
}

/**
 * Pick the rate a new Direct Debit customer would pay at a given moment.
 * Returns null when no rate is active, so callers can leave the tariff out
 * rather than show a made-up price.
 */
export function selectCurrentRate(
  records: readonly RateRecord[],
  at: Date,
): number | null {
  const candidates = records
    .filter(isDirectDebitOrAll)
    .filter((record) => isActiveAt(record, at))
    .sort((a, b) => {
      // A Direct Debit specific rate beats a general one.
      const methodOrder =
        Number(b.paymentMethod === "DIRECT_DEBIT") -
        Number(a.paymentMethod === "DIRECT_DEBIT");
      if (methodOrder !== 0) return methodOrder;
      return Date.parse(b.validFrom) - Date.parse(a.validFrom);
    });

  return candidates[0]?.valueIncVat ?? null;
}
