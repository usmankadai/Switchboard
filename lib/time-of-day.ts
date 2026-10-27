import type { HalfHourlyPrice } from "./estimate";
import { londonSlotIndex } from "./usage-profile";

/**
 * Prices by time of day: the average price for each half hour of the day
 * across recent days, in UK local time. Drives the "when is Agile cheap?"
 * chart and its text summary.
 */

export const SLOTS_PER_DAY = 48;

export type TimeOfDayPrice = {
  /** 0 is 00:00 to 00:30 UK time, 47 is 23:30 to midnight. */
  slot: number;
  averagePence: number;
};

/** Average price per half-hour slot. Slots with no prices are left out. */
export function averageByTimeOfDay(prices: readonly HalfHourlyPrice[]): TimeOfDayPrice[] {
  const sums = new Array<number>(SLOTS_PER_DAY).fill(0);
  const counts = new Array<number>(SLOTS_PER_DAY).fill(0);

  for (const price of prices) {
    const slot = londonSlotIndex(new Date(price.validFrom));
    sums[slot]! += price.pencePerKwh;
    counts[slot]! += 1;
  }

  return sums.flatMap((sum, slot) =>
    counts[slot] ? [{ slot, averagePence: sum / counts[slot]! }] : [],
  );
}

/** 33 → "16:30" */
export function slotStartTime(slot: number): string {
  const normalised = ((slot % SLOTS_PER_DAY) + SLOTS_PER_DAY) % SLOTS_PER_DAY;
  const hours = Math.floor(normalised / 2);
  return `${String(hours).padStart(2, "0")}:${normalised % 2 ? "30" : "00"}`;
}

/** Slot 33 → "16:30 to 17:00" */
export function slotRange(slot: number, length = 1): string {
  return `${slotStartTime(slot)} to ${slotStartTime(slot + length)}`;
}

export type PriceWindow = {
  startSlot: number;
  /** Number of half-hour slots, for example 6 for three hours. */
  length: number;
  averagePence: number;
};

/**
 * The cheapest or dearest run of consecutive half hours, wrapping past
 * midnight. Needs a full day of slots; returns null otherwise, rather than
 * guess across gaps.
 */
export function extremeWindow(
  byTimeOfDay: readonly TimeOfDayPrice[],
  length: number,
  which: "cheapest" | "dearest",
): PriceWindow | null {
  if (byTimeOfDay.length !== SLOTS_PER_DAY || length < 1 || length > SLOTS_PER_DAY) return null;
  const bySlot = new Array<number>(SLOTS_PER_DAY);
  for (const { slot, averagePence } of byTimeOfDay) bySlot[slot] = averagePence;

  let best: PriceWindow | null = null;
  for (let start = 0; start < SLOTS_PER_DAY; start++) {
    let sum = 0;
    for (let offset = 0; offset < length; offset++) {
      sum += bySlot[(start + offset) % SLOTS_PER_DAY]!;
    }
    const averagePence = sum / length;
    const better =
      best === null ||
      (which === "cheapest" ? averagePence < best.averagePence : averagePence > best.averagePence);
    if (better) best = { startSlot: start, length, averagePence };
  }
  return best;
}
