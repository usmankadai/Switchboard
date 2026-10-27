import { cacheLife } from "next/cache";
import { octopusDataSource } from "../datasources/octopus";
import { priceTariff, type TariffPricing } from "./tariffPricing";

/**
 * The priced result for one tariff in one region, cached for the hour.
 *
 * The raw data is cached too (in the datasource), but reading 30 days of
 * half-hourly Agile prices and averaging them took about 45ms of CPU per
 * request, which capped one server at about 20 comparisons a second. Caching
 * this small result instead makes a warm comparison a few cache reads and
 * some arithmetic. See ADR 2 and the load test write-up.
 *
 * Errors are thrown, never cached, so a failed tariff is retried next time.
 */
async function getTariffPricesCached(
  productCode: string,
  priceVaries: boolean,
  regionCode: string,
  at: string,
) {
  "use cache: remote";
  cacheLife("hours");

  return priceTariff(octopusDataSource, { productCode, priceVaries, regionCode, at });
}

export const cachedTariffPricing: TariffPricing = {
  getTariffPrices: ({ productCode, priceVaries, regionCode, at }) =>
    getTariffPricesCached(productCode, priceVaries, regionCode, at),
};
