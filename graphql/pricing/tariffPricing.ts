import { summarisePrices, type PriceSummary } from "@/lib/estimate";
import { selectCurrentRate, type RateRecord } from "@/lib/rates";
import { recentDaysWindow, todayWindow } from "@/lib/windows";
import type { EnergyDataSource } from "../datasources/types";

/** How much price history to average for tariffs whose price varies. */
export const RECENT_PRICE_DAYS = 30;

/** Everything needed to cost one tariff in one region. Small and serialisable. */
export type TariffPrices = {
  tariffCode: string;
  exitFeePence: number;
  /** Pence per kWh. For varying prices, the usage-weighted recent average. */
  unitRatePence: number;
  standingChargePencePerDay: number;
  recentPrices: PriceSummary | null;
};

export type TariffPriceRequest = {
  productCode: string;
  priceVaries: boolean;
  regionCode: string;
  /** The start of the current hour, as ISO. Part of the cache key. */
  at: string;
};

/**
 * Prices one tariff in one region. The comparison asks for these once per
 * tariff; working out the cost for a given usage is then simple arithmetic.
 */
export interface TariffPricing {
  /** null when the tariff cannot be priced in this region. Throws UpstreamError on upstream failure. */
  getTariffPrices(request: TariffPriceRequest): Promise<TariffPrices | null>;
}

/** "2026-10-27T12:34:56Z" → "2026-10-27T12:00:00.000Z" */
export function startOfHour(now: Date): string {
  const hour = new Date(now);
  hour.setUTCMinutes(0, 0, 0);
  return hour.toISOString();
}

/** Unit rates in the form the estimate maths expects (Direct Debit only). */
function toHalfHourlyPrices(records: readonly RateRecord[]) {
  return records
    .filter((record) => record.paymentMethod === null || record.paymentMethod === "DIRECT_DEBIT")
    .map((record) => ({ validFrom: record.validFrom, pencePerKwh: record.valueIncVat }));
}

export async function priceTariff(
  energy: EnergyDataSource,
  { productCode, priceVaries, regionCode, at }: TariffPriceRequest,
): Promise<TariffPrices | null> {
  const atDate = new Date(at);
  const regional = await energy.getRegionalTariff(productCode, regionCode);
  if (!regional) return null;

  const today = todayWindow(atDate);
  const [standingCharges, unitRates] = await Promise.all([
    energy.getStandingCharges(productCode, regional.tariffCode, today),
    energy.getUnitRates(
      productCode,
      regional.tariffCode,
      priceVaries ? recentDaysWindow(atDate, RECENT_PRICE_DAYS) : today,
    ),
  ]);

  const standingChargePencePerDay = selectCurrentRate(standingCharges, atDate);
  const recentPrices = priceVaries ? summarisePrices(toHalfHourlyPrices(unitRates)) : null;
  const unitRatePence = priceVaries
    ? (recentPrices?.averagePence ?? null)
    : selectCurrentRate(unitRates, atDate);

  if (standingChargePencePerDay === null || unitRatePence === null) return null;

  return {
    tariffCode: regional.tariffCode,
    exitFeePence: regional.exitFeePence,
    unitRatePence,
    standingChargePencePerDay,
    recentPrices,
  };
}

/** Uncached pricing over any datasource. Used directly in tests. */
export function createTariffPricing(energy: EnergyDataSource): TariffPricing {
  return { getTariffPrices: (request) => priceTariff(energy, request) };
}
