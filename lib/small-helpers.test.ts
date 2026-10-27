import { describe, expect, it } from "vitest";
import {
  formatPounds,
  formatStandingCharge,
  formatUnitRate,
  formatWholePounds,
  toWholePence,
} from "./money";
import { normalisePostcode } from "./postcode";
import { electricityTariffCode, parseRegionCode } from "./regions";
import { estimateAnnualKwh } from "./usage";

describe("money", () => {
  it("formats whole pence as pounds", () => {
    expect(formatPounds(81256)).toBe("£812.56");
    expect(formatPounds(123456789)).toBe("£1,234,567.89");
  });

  it("refuses fractional pence so totals are always rounded first", () => {
    expect(() => formatPounds(812.5)).toThrow();
  });

  it("formats whole pounds for headline figures", () => {
    expect(formatWholePounds(81256)).toBe("£813");
  });

  it("never produces negative zero", () => {
    expect(Object.is(toWholePence(-0.4), 0)).toBe(true);
  });

  it("formats rates with units", () => {
    expect(formatUnitRate(24.5)).toBe("24.50p per kWh");
    expect(formatStandingCharge(41.3869)).toBe("41.39p per day");
  });
});

describe("normalisePostcode", () => {
  it.each([
    ["sw1a1aa", "SW1A 1AA"],
    [" SW1A 1AA ", "SW1A 1AA"],
    ["m1 1ae", "M1 1AE"],
    ["B33 8TH", "B33 8TH"],
  ])("normalises %j to %j", (input, expected) => {
    expect(normalisePostcode(input)).toBe(expected);
  });

  it.each(["", "SW1A", "12345", "SW1A 1A"])("rejects %j", (input) => {
    expect(normalisePostcode(input)).toBeNull();
  });
});

describe("regions", () => {
  it("parses the API's group id", () => {
    expect(parseRegionCode("_C")).toBe("C");
    expect(parseRegionCode("_Z")).toBeNull();
  });

  it("builds a single-rate tariff code", () => {
    expect(electricityTariffCode("AGILE-24-10-01", "C")).toBe(
      "E-1R-AGILE-24-10-01-C",
    );
  });
});

describe("estimateAnnualKwh", () => {
  it("uses Ofgem's medium figure for a typical medium house of two", () => {
    expect(
      estimateAnnualKwh({
        homeSize: "medium-house",
        occupants: 2,
        hasElectricVehicle: false,
        hasHeatPump: false,
      }),
    ).toBe(2700);
  });

  it("adds an EV and a heat pump", () => {
    expect(
      estimateAnnualKwh({
        homeSize: "medium-house",
        occupants: 4,
        hasElectricVehicle: true,
        hasHeatPump: true,
      }),
    ).toBe(2700 + 600 + 2000 + 3500);
  });

  it("rejects impossible household sizes", () => {
    const answers = {
      homeSize: "flat" as const,
      hasElectricVehicle: false,
      hasHeatPump: false,
    };
    expect(() => estimateAnnualKwh({ ...answers, occupants: 0 })).toThrow();
    expect(() => estimateAnnualKwh({ ...answers, occupants: 2.5 })).toThrow();
  });
});
