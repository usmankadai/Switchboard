import type { EnergyDataSource } from "./datasources/types";
import type { TariffPricing } from "./pricing/tariffPricing";

export type GraphQLContext = {
  dataSources: { energy: EnergyDataSource };
  /** Priced tariffs. Cached in production; uncached over a fake in tests. */
  pricing: TariffPricing;
  /** Injected so tests can fix the clock. */
  now: Date;
};
