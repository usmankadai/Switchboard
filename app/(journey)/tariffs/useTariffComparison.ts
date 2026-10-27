"use client";

import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { useQuery } from "@apollo/client/react";
import { graphql } from "@/generated";
import type { SavedJourney } from "@/lib/journey-storage";

export const TariffComparisonQuery = graphql(`
  query TariffComparison($regionCode: ID!, $annualKwh: Int!) {
    tariffComparison(regionCode: $regionCode, annualKwh: $annualKwh) {
      pricesCheckedAt
      quotes {
        id
        kind
        displayName
        estimatedAnnualCostPence
        ...TariffCard_quote
        ...AgileExplainer_quote
      }
    }
  }
`);

export const COMPARISON_UNAVAILABLE =
  "We could not get today's prices just now. Please try again in a moment.";

/** A message the customer can act on, from whatever went wrong. */
export function comparisonErrorMessage(error: unknown): string {
  if (CombinedGraphQLErrors.is(error)) {
    const first = error.errors[0];
    if (first?.extensions?.code === "NO_TARIFFS_AVAILABLE") return first.message;
  }
  return COMPARISON_UNAVAILABLE;
}

/**
 * The comparison for the saved journey. Skipped until the region and usage
 * are known. Shared by the tariffs and signup steps, so the second one reads
 * straight from Apollo's cache.
 */
export function useTariffComparison(journey: SavedJourney | null) {
  const regionCode = journey?.regionCode;
  const annualKwh = journey?.annualKwh;
  const ready = Boolean(regionCode && annualKwh);

  return useQuery(TariffComparisonQuery, {
    variables: { regionCode: regionCode ?? "", annualKwh: annualKwh ?? 0 },
    skip: !ready,
    // Show "Checking prices" again while a retry is in flight.
    notifyOnNetworkStatusChange: true,
  });
}
