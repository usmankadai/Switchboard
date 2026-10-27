import { ApolloServer } from "@apollo/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductSummary } from "@/lib/products";
import type { RateRecord } from "@/lib/rates";
import type { GraphQLContext } from "../context";
import { UpstreamError, type EnergyDataSource } from "../datasources/types";
import { typeDefs } from "../schema/typeDefs";
import { resolvers } from "./index";

const now = new Date("2026-10-27T12:00:00Z");

const product = (
  code: string,
  overrides: Partial<ProductSummary> = {},
): ProductSummary => ({
  code,
  displayName: code,
  direction: "IMPORT",
  isVariable: true,
  isTracker: false,
  isPrepay: false,
  isBusiness: false,
  isRestricted: false,
  term: null,
  availableFrom: "2024-01-01T00:00:00Z",
  availableTo: null,
  ...overrides,
});

const openRate = (valueIncVat: number, paymentMethod: string | null = null): RateRecord => ({
  valueIncVat,
  validFrom: "2026-10-01T00:00:00Z",
  validTo: null,
  paymentMethod,
});

/** 30 days of flat 20p Agile prices, every half hour. */
const agilePrices: RateRecord[] = Array.from({ length: 30 * 48 }, (_, i) => {
  const from = Date.UTC(2026, 8, 27) + i * 30 * 60_000;
  return {
    valueIncVat: 20,
    validFrom: new Date(from).toISOString(),
    validTo: new Date(from + 30 * 60_000).toISOString(),
    paymentMethod: null,
  };
});

function fakeEnergy(): EnergyDataSource {
  return {
    postcodeExists: vi.fn(async () => true),
    lookupRegion: vi.fn(async () => "C"),
    listProducts: vi.fn(async () => [
      product("VAR-22-11-01", { displayName: "Flexible Octopus" }),
      product("OE-FIX-12M-26-10-27", { isVariable: false, term: 12, displayName: "Octopus 12M Fixed" }),
      product("AGILE-24-10-01", { displayName: "Agile Octopus" }),
    ]),
    getRegionalTariff: vi.fn(async (code: string, region: string) => ({
      tariffCode: `E-1R-${code}-${region}`,
      exitFeePence: code.startsWith("OE-FIX") ? 5000 : 0,
    })),
    getUnitRates: vi.fn(async (code: string) => {
      if (code.startsWith("AGILE")) return agilePrices;
      if (code.startsWith("OE-FIX")) return [openRate(29.5934)];
      return [openRate(28.0896, "NON_DIRECT_DEBIT"), openRate(26.5956, "DIRECT_DEBIT")];
    }),
    getStandingCharges: vi.fn(async () => [openRate(41.3869)]),
  };
}

const COMPARISON = /* GraphQL */ `
  query Comparison($regionCode: ID!, $annualKwh: Int!) {
    tariffComparison(regionCode: $regionCode, annualKwh: $annualKwh) {
      region { code name }
      annualKwh
      pricesCheckedAt
      unavailableKinds
      quotes {
        id
        kind
        termMonths
        exitFeePence
        unitRatePence
        standingChargePencePerDay
        estimatedAnnualCostPence
        priceVaries
        recentPrices { averagePence days }
      }
    }
  }
`;

let energy: EnergyDataSource;
const server = new ApolloServer<GraphQLContext>({ typeDefs, resolvers });

const REGION = /* GraphQL */ `
  query Region($postcode: String!) {
    region(postcode: $postcode) { code name }
  }
`;

async function execute(variables: Record<string, unknown>, query = COMPARISON) {
  const response = await server.executeOperation(
    { query, variables },
    { contextValue: { dataSources: { energy }, now } },
  );
  if (response.body.kind !== "single") throw new Error("Expected a single result");
  return { result: response.body.singleResult, cacheControl: response.http.headers.get("cache-control") };
}

async function run(variables: Record<string, unknown>, query = COMPARISON) {
  return (await execute(variables, query)).result;
}

beforeEach(() => {
  energy = fakeEnergy();
});

describe("tariffComparison", () => {
  it("combines region, products and prices into one response", async () => {
    const result = await run({ regionCode: "c", annualKwh: 2700 });

    expect(result.errors).toBeUndefined();
    const comparison = (result.data as { tariffComparison: Record<string, unknown> })
      .tariffComparison;
    expect(comparison.region).toEqual({ code: "C", name: "London" });
    expect(comparison.pricesCheckedAt).toBe(now.toISOString());
    expect(comparison.quotes).toMatchObject([
      {
        id: "E-1R-VAR-22-11-01-C",
        kind: "FLEXIBLE",
        unitRatePence: 26.5956, // Direct Debit price, not the higher one
        standingChargePencePerDay: 41.3869,
        // 26.5956 × 2,700 + 41.3869 × 365 = 86,914.3385
        estimatedAnnualCostPence: 86914,
        priceVaries: false,
        recentPrices: null,
      },
      {
        kind: "FIXED",
        termMonths: 12,
        exitFeePence: 5000,
        unitRatePence: 29.5934,
      },
      {
        kind: "AGILE",
        // Averaging adds floating point noise; it is rounded once in the total.
        unitRatePence: expect.closeTo(20, 10),
        priceVaries: true,
        recentPrices: { averagePence: expect.closeTo(20, 10), days: 30 },
      },
    ]);
  });

  it("asks for 30 whole days of Agile prices, so the cache key is stable", async () => {
    await run({ regionCode: "C", annualKwh: 2700 });
    expect(energy.getUnitRates).toHaveBeenCalledWith(
      "AGILE-24-10-01",
      "E-1R-AGILE-24-10-01-C",
      { from: "2026-09-27T00:00:00.000Z", to: "2026-10-27T00:00:00.000Z" },
    );
  });

  it("leaves out a tariff that has no price today", async () => {
    vi.mocked(energy.getUnitRates).mockImplementation(async (code) =>
      code.startsWith("OE-FIX") ? [] : [openRate(25)],
    );
    const result = await run({ regionCode: "C", annualKwh: 2700 });
    const kinds = (
      result.data as { tariffComparison: { quotes: { kind: string }[] } }
    ).tariffComparison.quotes.map((quote) => quote.kind);
    expect(kinds).not.toContain("FIXED");
  });

  it("rejects an unknown region code", async () => {
    const result = await run({ regionCode: "Z", annualKwh: 2700 });
    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: "BAD_USER_INPUT",
      field: "regionCode",
    });
    expect(energy.listProducts).not.toHaveBeenCalled();
  });

  it.each([0, -5, 50_001])("rejects annual usage of %d kWh", async (annualKwh) => {
    const result = await run({ regionCode: "C", annualKwh });
    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: "BAD_USER_INPUT",
      field: "annualKwh",
    });
  });

  it("turns an upstream failure into a friendly, retryable error", async () => {
    vi.mocked(energy.listProducts).mockRejectedValue(
      new UpstreamError("Octopus returned 503", "octopus"),
    );
    const result = await run({ regionCode: "C", annualKwh: 2700 });
    expect(result.errors?.[0]).toMatchObject({
      message: "We could not get prices right now. Please try again in a moment.",
      extensions: { code: "UPSTREAM_UNAVAILABLE" },
    });
  });

  it("still shows the other tariffs when one fails upstream", async () => {
    vi.mocked(energy.getUnitRates).mockImplementation(async (code) => {
      if (code.startsWith("AGILE")) throw new UpstreamError("timed out", "octopus");
      return [openRate(25)];
    });
    const result = await run({ regionCode: "C", annualKwh: 2700 });
    expect(result.errors).toBeUndefined();
    const comparison = (
      result.data as {
        tariffComparison: { quotes: { kind: string }[]; unavailableKinds: string[] };
      }
    ).tariffComparison;
    expect(comparison.quotes.map((quote) => quote.kind)).toEqual(["FLEXIBLE", "FIXED"]);
    expect(comparison.unavailableKinds).toEqual(["AGILE"]);
  });

  it("fails as a whole only when every tariff fails upstream", async () => {
    vi.mocked(energy.getStandingCharges).mockRejectedValue(
      new UpstreamError("Octopus returned 503", "octopus"),
    );
    const result = await run({ regionCode: "C", annualKwh: 2700 });
    expect(result.errors?.[0]?.extensions).toMatchObject({ code: "UPSTREAM_UNAVAILABLE" });
  });

  it("says so when no tariff can be priced", async () => {
    vi.mocked(energy.getRegionalTariff).mockResolvedValue(null);
    const result = await run({ regionCode: "C", annualKwh: 2700 });
    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: "NO_TARIFFS_AVAILABLE",
    });
  });
});

describe("region", () => {
  it("returns the region for a postcode in any format", async () => {
    const result = await run({ postcode: "sw1a1aa" }, REGION);
    expect(result.data).toEqual({ region: { code: "C", name: "London" } });
    expect(energy.lookupRegion).toHaveBeenCalledWith("SW1A 1AA");
  });

  it("rejects a badly formatted postcode without calling any API", async () => {
    const result = await run({ postcode: "not a postcode" }, REGION);
    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: "BAD_USER_INPUT",
      field: "postcode",
    });
    expect(energy.postcodeExists).not.toHaveBeenCalled();
  });

  it("reports a postcode that does not exist", async () => {
    vi.mocked(energy.postcodeExists).mockResolvedValue(false);
    const result = await run({ postcode: "ZZ1 1ZZ" }, REGION);
    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: "POSTCODE_NOT_FOUND",
      field: "postcode",
    });
  });

  it("turns an upstream failure into a friendly, retryable error", async () => {
    vi.mocked(energy.lookupRegion).mockRejectedValue(
      new UpstreamError("Octopus returned 503", "octopus"),
    );
    const result = await run({ postcode: "SW1A 1AA" }, REGION);
    expect(result.errors?.[0]?.extensions).toMatchObject({
      code: "UPSTREAM_UNAVAILABLE",
    });
  });
});

describe("cache hints", () => {
  it("lets a full comparison be cached for 5 minutes", async () => {
    const { cacheControl } = await execute({ regionCode: "C", annualKwh: 2700 });
    expect(cacheControl).toBe("max-age=300, public");
  });

  it("never marks a postcode lookup as cacheable", async () => {
    const { cacheControl } = await execute({ postcode: "SW1A 1AA" }, REGION);
    expect(cacheControl).toBe("no-store");
  });

  // Apollo marks anything uncacheable as no-store, so no CDN keeps it.
  it("never caches a partial comparison", async () => {
    vi.mocked(energy.getUnitRates).mockImplementation(async (code) => {
      if (code.startsWith("AGILE")) throw new UpstreamError("timed out", "octopus");
      return [openRate(25)];
    });
    const { cacheControl } = await execute({ regionCode: "C", annualKwh: 2700 });
    expect(cacheControl).toBe("no-store");
  });

  it("never caches an error", async () => {
    vi.mocked(energy.listProducts).mockRejectedValue(new UpstreamError("503", "octopus"));
    const { cacheControl } = await execute({ regionCode: "C", annualKwh: 2700 });
    expect(cacheControl).toBe("no-store");
  });
});
