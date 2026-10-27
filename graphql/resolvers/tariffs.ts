import { cacheControlFromInfo } from "@apollo/cache-control-types";
import { GraphQLError } from "graphql";
import type {
  QueryResolvers,
  Region,
  TariffKind,
  TariffQuote,
} from "@/generated/resolvers-types";
import { estimateAnnualCostPence } from "@/lib/estimate";
import { normalisePostcode } from "@/lib/postcode";
import {
  selectComparisonProducts,
  type ComparisonProduct,
} from "@/lib/products";
import { REGION_NAMES } from "@/lib/regions";
import { MAX_ANNUAL_KWH } from "@/lib/usage";
import type { GraphQLContext } from "../context";
import { UpstreamError } from "../datasources/types";
import { startOfHour } from "../pricing/tariffPricing";


export const ErrorCode = {
  BadUserInput: "BAD_USER_INPUT",
  PostcodeNotFound: "POSTCODE_NOT_FOUND",
  NoTariffs: "NO_TARIFFS_AVAILABLE",
  Upstream: "UPSTREAM_UNAVAILABLE",
} as const;

function userError(message: string, code: string, field: string) {
  return new GraphQLError(message, { extensions: { code, field } });
}

/** Turn datasource failures into a clear error the UI can offer a retry for. */
async function upstream<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof UpstreamError) {
      throw new GraphQLError(
        "We could not get prices right now. Please try again in a moment.",
        { extensions: { code: ErrorCode.Upstream, service: error.service } },
      );
    }
    throw error;
  }
}

async function resolveRegion(
  rawPostcode: string,
  { dataSources }: GraphQLContext,
): Promise<Region> {
  const postcode = normalisePostcode(rawPostcode);
  if (!postcode) {
    throw userError(
      "Enter a real postcode, like SW1A 1AA",
      ErrorCode.BadUserInput,
      "postcode",
    );
  }

  return upstream(async () => {
    const [exists, regionCode] = await Promise.all([
      dataSources.energy.postcodeExists(postcode),
      dataSources.energy.lookupRegion(postcode),
    ]);
    if (!exists || !regionCode) {
      throw userError(
        "We could not find that postcode. Check it and try again",
        ErrorCode.PostcodeNotFound,
        "postcode",
      );
    }
    return { code: regionCode, name: REGION_NAMES[regionCode] ?? regionCode };
  });
}

/**
 * Build one quote, or return null when this tariff cannot be priced in this
 * region (the UI then simply does not show it). The prices come from the
 * pricing layer (cached per tariff, region and hour); only the cost for this
 * usage is worked out per request.
 */
async function buildQuote(
  { kind, product }: ComparisonProduct,
  regionCode: string,
  annualKwh: number,
  { pricing, now }: GraphQLContext,
): Promise<TariffQuote | null> {
  const priceVaries = kind === "AGILE" || kind === "TRACKER";
  const prices = await pricing.getTariffPrices({
    productCode: product.code,
    priceVaries,
    regionCode,
    at: startOfHour(now),
  });
  if (!prices) return null;

  return {
    id: prices.tariffCode,
    kind,
    productCode: product.code,
    displayName: product.displayName,
    termMonths: product.term,
    exitFeePence: prices.exitFeePence,
    unitRatePence: prices.unitRatePence,
    standingChargePencePerDay: prices.standingChargePencePerDay,
    estimatedAnnualCostPence: estimateAnnualCostPence({
      unitRatePence: prices.unitRatePence,
      standingChargePencePerDay: prices.standingChargePencePerDay,
      annualKwh,
    }),
    priceVaries,
    recentPrices: prices.recentPrices,
  };
}

export const tariffQueries: QueryResolvers<GraphQLContext> = {
  region: (_parent, { postcode }, context) => resolveRegion(postcode, context),

  tariffComparison: async (_parent, { regionCode, annualKwh }, context, info) => {
    const code = regionCode.toUpperCase();
    const regionName = REGION_NAMES[code];
    if (!regionName) {
      throw userError(
        "That region code is not recognised",
        ErrorCode.BadUserInput,
        "regionCode",
      );
    }

    if (!Number.isInteger(annualKwh) || annualKwh < 1 || annualKwh > MAX_ANNUAL_KWH) {
      throw userError(
        `Enter your yearly usage as a whole number of kWh, from 1 to ${MAX_ANNUAL_KWH.toLocaleString("en-GB")}`,
        ErrorCode.BadUserInput,
        "annualKwh",
      );
    }

    const region: Region = { code, name: regionName };

    // Without the product list there is nothing to compare, so that failure
    // fails the whole query.
    const products = await upstream(async () =>
      selectComparisonProducts(await context.dataSources.energy.listProducts(), context.now),
    );

    // One tariff's prices failing should not hide the others. Settle each one
    // separately and report which kinds are missing.
    const settled = await Promise.allSettled(
      products.map((product) => buildQuote(product, region.code, annualKwh, context)),
    );

    const quotes: TariffQuote[] = [];
    const unavailableKinds: TariffKind[] = [];
    settled.forEach((result, index) => {
      if (result.status === "fulfilled") {
        if (result.value) quotes.push(result.value);
      } else if (result.reason instanceof UpstreamError) {
        unavailableKinds.push(products[index]!.kind);
      } else {
        throw result.reason;
      }
    });

    // Never let a CDN keep a partial comparison: the next request should
    // try the missing tariffs again.
    if (unavailableKinds.length > 0) cacheControlFromInfo(info).setCacheHint({ maxAge: 0 });

    if (quotes.length === 0 && unavailableKinds.length > 0) {
      throw new GraphQLError(
        "We could not get prices right now. Please try again in a moment.",
        { extensions: { code: ErrorCode.Upstream } },
      );
    }

    if (quotes.length === 0) {
      throw new GraphQLError(
        "There are no tariffs we can show for this postcode right now.",
        { extensions: { code: ErrorCode.NoTariffs } },
      );
    }

    return {
      region,
      annualKwh,
      quotes,
      unavailableKinds,
      pricesCheckedAt: context.now.toISOString(),
    };
  },
};
