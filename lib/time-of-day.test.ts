import { describe, expect, it } from "vitest";
import type { HalfHourlyPrice } from "./estimate";
import {
  averageByTimeOfDay,
  extremeWindow,
  slotRange,
  slotStartTime,
  type TimeOfDayPrice,
} from "./time-of-day";

/** One winter day (GMT, so UTC equals UK time) of prices from a function of the slot. */
function winterDay(day: number, priceForSlot: (slot: number) => number): HalfHourlyPrice[] {
  return Array.from({ length: 48 }, (_, slot) => ({
    validFrom: new Date(Date.UTC(2026, 0, day) + slot * 30 * 60_000).toISOString(),
    pencePerKwh: priceForSlot(slot),
  }));
}

const flatDay = (price: number): TimeOfDayPrice[] =>
  Array.from({ length: 48 }, (_, slot) => ({ slot, averagePence: price }));

describe("averageByTimeOfDay", () => {
  it("averages each half hour across days", () => {
    const prices = [...winterDay(14, () => 10), ...winterDay(15, () => 20)];
    const result = averageByTimeOfDay(prices);
    expect(result).toHaveLength(48);
    expect(result.every((entry) => entry.averagePence === 15)).toBe(true);
  });

  it("uses UK time, so in summer 16:00 UTC is the 17:00 slot", () => {
    const result = averageByTimeOfDay([{ validFrom: "2026-07-01T16:00:00Z", pencePerKwh: 42 }]);
    expect(result).toEqual([{ slot: 34, averagePence: 42 }]);
  });

  it("leaves out slots with no prices and handles negative prices", () => {
    const result = averageByTimeOfDay([
      { validFrom: "2026-01-15T03:00:00Z", pencePerKwh: -4 },
      { validFrom: "2026-01-16T03:00:00Z", pencePerKwh: -2 },
    ]);
    expect(result).toEqual([{ slot: 6, averagePence: -3 }]);
  });
});

describe("slot labels", () => {
  it("formats start times and ranges, wrapping at midnight", () => {
    expect(slotStartTime(0)).toBe("00:00");
    expect(slotStartTime(33)).toBe("16:30");
    expect(slotRange(33)).toBe("16:30 to 17:00");
    expect(slotRange(32, 6)).toBe("16:00 to 19:00");
    expect(slotRange(46, 6)).toBe("23:00 to 02:00");
  });
});

describe("extremeWindow", () => {
  const day = winterDay(15, (slot) => (slot >= 32 && slot < 38 ? 40 : slot < 6 ? 5 : 20));
  const byTime = averageByTimeOfDay(day);

  it("finds the cheapest three hours", () => {
    expect(extremeWindow(byTime, 6, "cheapest")).toEqual({ startSlot: 0, length: 6, averagePence: 5 });
  });

  it("finds the dearest three hours", () => {
    expect(extremeWindow(byTime, 6, "dearest")).toEqual({ startSlot: 32, length: 6, averagePence: 40 });
  });

  it("can wrap past midnight", () => {
    const wrapped = flatDay(20).map((entry) =>
      entry.slot >= 46 || entry.slot < 4 ? { ...entry, averagePence: 3 } : entry,
    );
    expect(extremeWindow(wrapped, 6, "cheapest")?.startSlot).toBe(46);
  });

  it("refuses to guess with missing slots", () => {
    expect(extremeWindow(byTime.slice(1), 6, "cheapest")).toBeNull();
  });
});
