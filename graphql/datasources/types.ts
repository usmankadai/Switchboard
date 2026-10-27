import type { ProductSummary } from "@/lib/products";
import type { RateRecord } from "@/lib/rates";
import type { DayWindow } from "@/lib/windows";

export type { DayWindow };

/** A product's single-rate electricity tariff in one region. */
export type RegionalTariff = {
  tariffCode: string;
  /** Whole pence. */
  exitFeePence: number;
};

/**
 * Everything the resolvers need from the outside world. The real version
 * lives in ./octopus.ts; tests pass a fake.
 */
export interface EnergyDataSource {
  /** False when postcodes.io does not know the postcode. */
  postcodeExists(postcode: string): Promise<boolean>;
  /** Region letter such as "C", or null when the postcode has no region. */
  lookupRegion(postcode: string): Promise<string | null>;
  listProducts(): Promise<ProductSummary[]>;
  /** null when the product has no single-rate tariff in that region. */
  getRegionalTariff(
    productCode: string,
    regionCode: string,
  ): Promise<RegionalTariff | null>;
  /** Unit rates in force at any point from the start of `window.from`. */
  getUnitRates(
    productCode: string,
    tariffCode: string,
    window: DayWindow,
  ): Promise<RateRecord[]>;
  getStandingCharges(
    productCode: string,
    tariffCode: string,
    window: DayWindow,
  ): Promise<RateRecord[]>;
}

/** Thrown when an upstream API fails or returns something unexpected. */
export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly service: "octopus" | "postcodes.io",
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}
