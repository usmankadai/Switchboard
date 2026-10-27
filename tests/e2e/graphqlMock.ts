import type { Page } from "@playwright/test";

type Reply = Record<string, unknown>;

/**
 * Answer the browser's GraphQL calls by operation name, so tests do not
 * depend on live APIs. Give an array to answer successive calls in turn
 * (the last reply repeats). Unmocked operations fail the test loudly.
 */
export async function mockGraphQL(page: Page, replies: Record<string, Reply | Reply[]>) {
  const queues = new Map(
    Object.entries(replies).map(([name, reply]) => [name, Array.isArray(reply) ? [...reply] : [reply]]),
  );

  // Match on the path, so GET requests (with a query string) are caught too.
  await page.route((url) => url.pathname === "/api/graphql", async (route) => {
    // Queries arrive as GET (operation name in the query string), mutations as POST.
    const request = route.request();
    const operationName =
      request.method() === "GET"
        ? new URL(request.url()).searchParams.get("operationName")
        : (request.postDataJSON() as { operationName?: string } | null)?.operationName;
    const queue = operationName ? queues.get(operationName) : undefined;
    if (!queue) {
      await route.fulfill({
        status: 500,
        json: { errors: [{ message: `No mock for ${operationName ?? "unknown operation"}` }] },
      });
      return;
    }
    const reply = queue.length > 1 ? queue.shift()! : queue[0];
    await route.fulfill({ json: reply });
  });
}

export const regionReply = (code: string, name: string) => ({
  data: { region: { __typename: "Region", code, name } },
});

export const errorReply = (message: string, code: string, field?: string) => ({
  data: null,
  errors: [{ message, extensions: { code, ...(field ? { field } : {}) } }],
});

/**
 * A typical Agile shape: cheap overnight, a midday dip, an evening peak.
 * Shared with the component tests so both see the same chart.
 */
export const agileByTimeOfDay = Array.from({ length: 48 }, (_, slot) => {
  const hour = slot / 2;
  const averagePence =
    hour >= 16 && hour < 19 ? 44 + (slot % 3) : hour < 5 ? 12 + (slot % 4) : hour >= 12 && hour < 15 ? 18 : 26;
  return { __typename: "TimeOfDayPrice", slot, averagePence };
});

const quote = (overrides: Record<string, unknown>) => ({
  __typename: "TariffQuote",
  termMonths: null,
  exitFeePence: 0,
  priceVaries: false,
  recentPrices: null,
  ...overrides,
});

/** Shaped like a real London comparison for 2,700 kWh on 27 October 2026. */
export const comparisonReply = {
  data: {
    tariffComparison: {
      __typename: "TariffComparison",
      pricesCheckedAt: "2026-10-27T12:00:00.000Z",
      unavailableKinds: [],
      quotes: [
        quote({
          id: "E-1R-VAR-22-11-01-C",
          kind: "FLEXIBLE",
          displayName: "Flexible Octopus",
          unitRatePence: 26.5956,
          standingChargePencePerDay: 41.3869,
          estimatedAnnualCostPence: 86914,
        }),
        quote({
          id: "E-1R-OE-FIX-12M-26-10-27-C",
          kind: "FIXED",
          displayName: "Octopus 12M Fixed",
          termMonths: 12,
          exitFeePence: 5000,
          unitRatePence: 29.5934,
          standingChargePencePerDay: 41.3869,
          estimatedAnnualCostPence: 95008,
        }),
        quote({
          id: "E-1R-AGILE-24-10-01-C",
          kind: "AGILE",
          displayName: "Agile Octopus",
          termMonths: 12,
          priceVaries: true,
          unitRatePence: 28.19,
          standingChargePencePerDay: 37.6525,
          estimatedAnnualCostPence: 89868,
          recentPrices: {
            __typename: "PriceSummary",
            averagePence: 28.19,
            minPence: -7.34,
            maxPence: 67.053,
            days: 30,
            byTimeOfDay: agileByTimeOfDay,
          },
        }),
      ],
    },
  },
};

export const startSwitchReply = (tariffId: string) => ({
  data: {
    startSwitch: { __typename: "StartSwitchResult", reference: "SB-3F9A1C2E", tariffId },
  },
});
