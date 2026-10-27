import { formatPounds, formatWholePounds } from "./money";

/**
 * Plain-English wording for the tariff comparison. Kept here, out of the
 * components, so it can be unit tested.
 */

/** Rounded monthly equivalent of a yearly estimate, in whole pence. */
export function monthlyPence(annualPence: number): number {
  return Math.round(annualPence / 12);
}

/** "£950 a year" and "about £79 a month" for the headline. */
export function describeCost(annualPence: number): { yearly: string; monthly: string } {
  return {
    yearly: `${formatWholePounds(annualPence)} a year`,
    monthly: `about ${formatWholePounds(monthlyPence(annualPence))} a month`,
  };
}

export function describeTerm(termMonths: number | null, priceVaries: boolean): string {
  if (termMonths === null) return "No fixed term";
  if (priceVaries) return `${termMonths} month contract, price changes`;
  return `Price fixed for ${termMonths} months`;
}

export function describeExitFee(exitFeePence: number): string {
  return exitFeePence === 0 ? "No exit fee" : `${formatPounds(exitFeePence)} to leave early`;
}

export type CostedQuote = { id: string; estimatedAnnualCostPence: number };

/**
 * The quote with the lowest estimated cost, or null when it is a tie or
 * there is nothing to compare. A tie gets no label, so we never single one
 * out unfairly.
 */
export function cheapestQuoteId(quotes: readonly CostedQuote[]): string | null {
  if (quotes.length < 2) return null;
  const sorted = [...quotes].sort(
    (a, b) => a.estimatedAnnualCostPence - b.estimatedAnnualCostPence,
  );
  const [first, second] = sorted;
  if (!first || !second) return null;
  return first.estimatedAnnualCostPence < second.estimatedAnnualCostPence ? first.id : null;
}

const checkedAtFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  hour: "2-digit",
  minute: "2-digit",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** "Prices checked at 14:05 on 27 October 2026", in UK time. */
export function describeCheckedAt(iso: string): string {
  const parts = Object.fromEntries(
    checkedAtFormatter.formatToParts(new Date(iso)).map((part) => [part.type, part.value]),
  );
  return `Prices checked at ${parts.hour}:${parts.minute} on ${parts.day} ${parts.month} ${parts.year}`;
}

const KIND_NAMES = {
  FLEXIBLE: "Flexible",
  FIXED: "Fixed",
  TRACKER: "Tracker",
  AGILE: "Agile",
} as const;

/** ["FIXED", "AGILE"] → "Fixed and Agile" */
export function describeKinds(kinds: readonly (keyof typeof KIND_NAMES)[]): string {
  const names = kinds.map((kind) => KIND_NAMES[kind]);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}
