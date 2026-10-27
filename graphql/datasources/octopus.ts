import { cacheLife } from "next/cache";
import { fetchJson } from "./http";
import type { ProductSummary } from "@/lib/products";
import type { RateRecord } from "@/lib/rates";
import { electricityTariffCode, parseRegionCode } from "@/lib/regions";
import {
  UpstreamError,
  type DayWindow,
  type EnergyDataSource,
  type RegionalTariff,
} from "./types";

/**
 * Clients for the public Octopus Energy API and postcodes.io. Neither needs
 * an API key.
 *
 * Caching: each function uses 'use cache: remote' with an explicit lifetime.
 * Plain 'use cache' is in-memory per server instance, which on serverless
 * hosting barely survives between requests, so a traffic spike would still
 * reach the upstream API. The remote cache is shared by every instance (the
 * platform provides it; locally it falls back to in-memory).
 *
 * Past `revalidate` but within `expire`, the old entry is served while a fresh
 * one is fetched in the background, so a short upstream outage is invisible.
 * Errors are thrown, not cached. Arguments are part of the cache key, so
 * callers pass whole-day windows rather than "now". See ADR 2.
 */

const OCTOPUS_API = "https://api.octopus.energy/v1";
const POSTCODES_API = "https://api.postcodes.io";

/** The API allows up to 1,500 results per page; 30 days of Agile is 1,440. */
const PAGE_SIZE = 1500;

// Small runtime guards. The API is public and could change shape, so check
// the fields we rely on rather than trusting a type assertion.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

type Paged = { next: string | null; results: unknown[] };

function asPaged(value: unknown): Paged {
  if (!isRecord(value) || !Array.isArray(value.results)) {
    throw new UpstreamError("octopus returned an unexpected list response", "octopus");
  }
  return {
    next: typeof value.next === "string" ? value.next : null,
    results: value.results,
  };
}

async function getAllPages(firstUrl: string, endpoint: string): Promise<unknown[]> {
  const results: unknown[] = [];
  let url: string | null = firstUrl;
  // Guard against an endless loop if the API ever links to itself.
  for (let page = 0; url && page < 20; page++) {
    const paged = asPaged(await fetchJson(url, { service: "octopus", endpoint }));
    results.push(...paged.results);
    url = paged.next;
  }
  return results;
}

function toRateRecord(value: unknown): RateRecord {
  if (
    !isRecord(value) ||
    typeof value.value_inc_vat !== "number" ||
    typeof value.valid_from !== "string"
  ) {
    throw new UpstreamError("Unexpected rate record", "octopus");
  }
  return {
    valueIncVat: value.value_inc_vat,
    validFrom: value.valid_from,
    validTo: typeof value.valid_to === "string" ? value.valid_to : null,
    paymentMethod:
      typeof value.payment_method === "string" ? value.payment_method : null,
  };
}

function toProductSummary(value: unknown): ProductSummary {
  if (
    !isRecord(value) ||
    typeof value.code !== "string" ||
    typeof value.available_from !== "string"
  ) {
    throw new UpstreamError("Unexpected product record", "octopus");
  }
  return {
    code: value.code,
    displayName:
      typeof value.display_name === "string" ? value.display_name : value.code,
    direction: value.direction === "EXPORT" ? "EXPORT" : "IMPORT",
    isVariable: value.is_variable === true,
    isTracker: value.is_tracker === true,
    isPrepay: value.is_prepay === true,
    isBusiness: value.is_business === true,
    isRestricted: value.is_restricted === true,
    term: typeof value.term === "number" ? value.term : null,
    availableFrom: value.available_from,
    availableTo:
      typeof value.available_to === "string" ? value.available_to : null,
  };
}

function compactPostcode(postcode: string): string {
  return encodeURIComponent(postcode.replace(/\s+/g, "").toUpperCase());
}

export async function postcodeExists(postcode: string): Promise<boolean> {
  "use cache: remote";
  cacheLife("weeks");

  const body = await fetchJson(
    `${POSTCODES_API}/postcodes/${compactPostcode(postcode)}/validate`,
    { service: "postcodes.io", endpoint: "postcode validate" },
  );
  return isRecord(body) && body.result === true;
}

export async function lookupRegion(postcode: string): Promise<string | null> {
  "use cache: remote";
  cacheLife("weeks");

  const paged = asPaged(
    await fetchJson(
      `${OCTOPUS_API}/industry/grid-supply-points/?postcode=${compactPostcode(postcode)}`,
      { service: "octopus", endpoint: "grid supply points" },
    ),
  );
  const first = paged.results[0];
  return isRecord(first) && typeof first.group_id === "string"
    ? parseRegionCode(first.group_id)
    : null;
}

export async function listProducts(): Promise<ProductSummary[]> {
  "use cache: remote";
  cacheLife("days");

  const results = await getAllPages(
    `${OCTOPUS_API}/products/?brand=OCTOPUS_ENERGY&is_business=false&page_size=100`,
    "products",
  );
  return results.map(toProductSummary);
}

export async function getRegionalTariff(
  productCode: string,
  regionCode: string,
): Promise<RegionalTariff | null> {
  "use cache: remote";
  cacheLife("days");

  const product = await fetchJson(
    `${OCTOPUS_API}/products/${encodeURIComponent(productCode)}/`,
    { service: "octopus", endpoint: "product detail" },
  );
  if (!isRecord(product) || !isRecord(product.single_register_electricity_tariffs)) {
    return null;
  }
  const regional = product.single_register_electricity_tariffs[`_${regionCode}`];
  // Fixed and Agile list the tariff under "direct_debit_monthly"; Flexible
  // lists it under "varying".
  const tariff = isRecord(regional)
    ? (regional.direct_debit_monthly ?? regional.varying)
    : undefined;
  if (!isRecord(tariff)) return null;

  // Prices in this response can be null for products launched today, so
  // only the code and exit fee are read here. Prices come from the rates
  // endpoints.
  return {
    tariffCode:
      typeof tariff.code === "string"
        ? tariff.code
        : electricityTariffCode(productCode, regionCode),
    exitFeePence:
      typeof tariff.exit_fees_inc_vat === "number"
        ? Math.round(tariff.exit_fees_inc_vat)
        : 0,
  };
}

function ratesUrl(
  productCode: string,
  tariffCode: string,
  kind: "standard-unit-rates" | "standing-charges",
  window: DayWindow,
): string {
  const params = new URLSearchParams({
    page_size: String(PAGE_SIZE),
    period_from: window.from,
    period_to: window.to,
  });
  return `${OCTOPUS_API}/products/${encodeURIComponent(productCode)}/electricity-tariffs/${encodeURIComponent(tariffCode)}/${kind}/?${params}`;
}

export async function getUnitRates(
  productCode: string,
  tariffCode: string,
  window: DayWindow,
): Promise<RateRecord[]> {
  "use cache: remote";
  // Agile prices for tomorrow land each afternoon, so refresh hourly.
  cacheLife("hours");

  const results = await getAllPages(
    ratesUrl(productCode, tariffCode, "standard-unit-rates", window),
    "unit rates",
  );
  return results.map(toRateRecord);
}

export async function getStandingCharges(
  productCode: string,
  tariffCode: string,
  window: DayWindow,
): Promise<RateRecord[]> {
  "use cache: remote";
  cacheLife("hours");

  const results = await getAllPages(
    ratesUrl(productCode, tariffCode, "standing-charges", window),
    "standing charges",
  );
  return results.map(toRateRecord);
}

export const octopusDataSource: EnergyDataSource = {
  postcodeExists,
  lookupRegion,
  listProducts,
  getRegionalTariff,
  getUnitRates,
  getStandingCharges,
};
