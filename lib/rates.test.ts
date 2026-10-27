import { describe, expect, it } from "vitest";
import { selectCurrentRate, type RateRecord } from "./rates";

const now = new Date("2026-10-27T12:00:00Z");

const rate = (overrides: Partial<RateRecord>): RateRecord => ({
  valueIncVat: 25,
  validFrom: "2026-10-01T00:00:00Z",
  validTo: null,
  paymentMethod: null,
  ...overrides,
});

describe("selectCurrentRate", () => {
  it("returns the open-ended rate in force now", () => {
    expect(selectCurrentRate([rate({ valueIncVat: 26.5956 })], now)).toBe(
      26.5956,
    );
  });

  it("prefers the Direct Debit price over the non Direct Debit one", () => {
    const records = [
      rate({ valueIncVat: 28.0896, paymentMethod: "NON_DIRECT_DEBIT" }),
      rate({ valueIncVat: 26.5956, paymentMethod: "DIRECT_DEBIT" }),
    ];
    expect(selectCurrentRate(records, now)).toBe(26.5956);
  });

  it("prefers a Direct Debit specific rate over a general one", () => {
    const records = [
      rate({ valueIncVat: 30, paymentMethod: null }),
      rate({ valueIncVat: 27, paymentMethod: "DIRECT_DEBIT" }),
    ];
    expect(selectCurrentRate(records, now)).toBe(27);
  });

  it("ignores rates that have ended or not started", () => {
    const records = [
      rate({ valueIncVat: 20, validTo: "2026-10-01T00:00:00Z", validFrom: "2026-07-01T00:00:00Z" }),
      rate({ valueIncVat: 40, validFrom: "2026-11-01T00:00:00Z" }),
      rate({ valueIncVat: 25 }),
    ];
    expect(selectCurrentRate(records, now)).toBe(25);
  });

  it("treats valid_to as exclusive", () => {
    const records = [rate({ validTo: "2026-10-27T12:00:00Z" })];
    expect(selectCurrentRate(records, now)).toBeNull();
  });

  it("returns null when nothing is in force", () => {
    expect(selectCurrentRate([], now)).toBeNull();
  });
});
