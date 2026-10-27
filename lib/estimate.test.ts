import { describe, expect, it } from "vitest";
import {
  estimateAnnualCostPence,
  summarisePrices,
  usageWeightedAverageRate,
  type HalfHourlyPrice,
} from "./estimate";
import { DOMESTIC_PROFILE, londonSlotIndex } from "./usage-profile";

describe("estimateAnnualCostPence", () => {
  it("keeps fractional rates until the end and rounds once", () => {
    // 24.5p × 2,700 kWh = 66,150p; 41.3869p × 365 = 15,106.2185p
    expect(
      estimateAnnualCostPence({
        unitRatePence: 24.5,
        standingChargePencePerDay: 41.3869,
        annualKwh: 2700,
      }),
    ).toBe(81256);
  });

  it("does not round each part separately", () => {
    // Rounding the standing charge to 41p first would give 81,115p.
    const total = estimateAnnualCostPence({
      unitRatePence: 24.5,
      standingChargePencePerDay: 41.3869,
      annualKwh: 2700,
    });
    expect(total).not.toBe(66150 + Math.round(41.3869) * 365);
  });

  it("charges only the standing charge for zero usage", () => {
    expect(
      estimateAnnualCostPence({
        unitRatePence: 30,
        standingChargePencePerDay: 50,
        annualKwh: 0,
      }),
    ).toBe(18250);
  });

  it("rejects negative usage", () => {
    expect(() =>
      estimateAnnualCostPence({
        unitRatePence: 30,
        standingChargePencePerDay: 50,
        annualKwh: -1,
      }),
    ).toThrow(RangeError);
  });
});

describe("londonSlotIndex", () => {
  it("uses GMT in winter", () => {
    expect(londonSlotIndex(new Date("2026-01-15T17:00:00Z"))).toBe(34);
  });

  it("uses BST in summer, so 17:00 UTC is the 18:00 slot", () => {
    expect(londonSlotIndex(new Date("2026-07-01T17:00:00Z"))).toBe(36);
  });

  it("puts a :30 start in the second slot of the hour", () => {
    expect(londonSlotIndex(new Date("2026-01-15T00:30:00Z"))).toBe(1);
  });
});

describe("usageWeightedAverageRate", () => {
  const profile = [3, 1, ...Array<number>(46).fill(0)];

  it("weights each price by the usage in its slot", () => {
    const prices: HalfHourlyPrice[] = [
      { validFrom: "2026-01-15T00:00:00Z", pencePerKwh: 10 },
      { validFrom: "2026-01-15T00:30:00Z", pencePerKwh: 30 },
    ];
    // (10 × 3 + 30 × 1) / 4
    expect(usageWeightedAverageRate(prices, profile)).toBe(15);
  });

  it("handles negative prices", () => {
    const prices: HalfHourlyPrice[] = [
      { validFrom: "2026-01-15T00:00:00Z", pencePerKwh: -8 },
      { validFrom: "2026-01-15T00:30:00Z", pencePerKwh: 40 },
    ];
    // (-8 × 3 + 40 × 1) / 4
    expect(usageWeightedAverageRate(prices, profile)).toBe(4);
  });

  it("returns null with no prices", () => {
    expect(usageWeightedAverageRate([])).toBeNull();
  });

  it("gives a flat price back unchanged with the real profile", () => {
    const prices: HalfHourlyPrice[] = Array.from({ length: 48 }, (_, i) => ({
      validFrom: new Date(Date.UTC(2026, 0, 15) + i * 30 * 60_000).toISOString(),
      pencePerKwh: 20,
    }));
    expect(usageWeightedAverageRate(prices)).toBeCloseTo(20, 10);
  });

  it("covers a 25 hour clock change day without errors", () => {
    // 25 October 2026: clocks go back, so the day has 50 half hours.
    const prices: HalfHourlyPrice[] = Array.from({ length: 50 }, (_, i) => ({
      validFrom: new Date(
        Date.UTC(2026, 9, 24, 23) + i * 30 * 60_000,
      ).toISOString(),
      pencePerKwh: i,
    }));
    expect(usageWeightedAverageRate(prices)).not.toBeNull();
  });
});

describe("DOMESTIC_PROFILE", () => {
  it("has one positive weight for every half hour", () => {
    expect(DOMESTIC_PROFILE).toHaveLength(48);
    expect(DOMESTIC_PROFILE.every((weight) => weight > 0)).toBe(true);
  });

  it("peaks in the evening", () => {
    const peakSlot = DOMESTIC_PROFILE.indexOf(Math.max(...DOMESTIC_PROFILE));
    expect(peakSlot).toBeGreaterThanOrEqual(34); // 17:00
    expect(peakSlot).toBeLessThanOrEqual(39); // 19:30
  });
});

describe("summarisePrices", () => {
  it("reports min, max and the number of UK days covered", () => {
    const summary = summarisePrices([
      { validFrom: "2026-01-15T10:00:00Z", pencePerKwh: -2 },
      { validFrom: "2026-01-15T18:00:00Z", pencePerKwh: 35 },
      { validFrom: "2026-01-16T10:00:00Z", pencePerKwh: 20 },
    ]);
    expect(summary).toMatchObject({ minPence: -2, maxPence: 35, days: 2 });
  });

  it("returns null with no prices", () => {
    expect(summarisePrices([])).toBeNull();
  });
});
