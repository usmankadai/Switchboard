import { describe, expect, it } from "vitest";
import {
  cheapestQuoteId,
  describeCheckedAt,
  describeCost,
  describeExitFee,
  describeKinds,
  describeTerm,
  monthlyPence,
} from "./comparison";

describe("describeCost", () => {
  it("gives a yearly figure and a monthly equivalent", () => {
    expect(describeCost(95008)).toEqual({
      yearly: "£950 a year",
      monthly: "about £79 a month",
    });
  });

  it("rounds the monthly figure from pence, once", () => {
    expect(monthlyPence(100)).toBe(8);
  });
});

describe("describeTerm", () => {
  it.each([
    [null, false, "No fixed term"],
    [12, false, "Price fixed for 12 months"],
    [12, true, "12 month contract, price changes"],
  ] as const)("term %s, varies %s → %s", (term, varies, expected) => {
    expect(describeTerm(term, varies)).toBe(expected);
  });
});

describe("describeExitFee", () => {
  it("says when there is no fee", () => {
    expect(describeExitFee(0)).toBe("No exit fee");
  });

  it("shows the fee in pounds", () => {
    expect(describeExitFee(5000)).toBe("£50.00 to leave early");
  });
});

describe("cheapestQuoteId", () => {
  it("finds the lowest estimate", () => {
    expect(
      cheapestQuoteId([
        { id: "a", estimatedAnnualCostPence: 95000 },
        { id: "b", estimatedAnnualCostPence: 87000 },
        { id: "c", estimatedAnnualCostPence: 99000 },
      ]),
    ).toBe("b");
  });

  it("labels nothing on a tie", () => {
    expect(
      cheapestQuoteId([
        { id: "a", estimatedAnnualCostPence: 87000 },
        { id: "b", estimatedAnnualCostPence: 87000 },
      ]),
    ).toBeNull();
  });

  it("labels nothing when there is only one tariff", () => {
    expect(cheapestQuoteId([{ id: "a", estimatedAnnualCostPence: 1 }])).toBeNull();
  });
});

describe("describeCheckedAt", () => {
  it("uses UK time", () => {
    expect(describeCheckedAt("2026-07-01T13:05:00Z")).toBe(
      "Prices checked at 14:05 on 1 July 2026",
    );
  });
});

describe("describeKinds", () => {
  it("joins tariff types in plain English", () => {
    expect(describeKinds(["AGILE"])).toBe("Agile");
    expect(describeKinds(["FIXED", "AGILE"])).toBe("Fixed and Agile");
    expect(describeKinds(["FLEXIBLE", "FIXED", "AGILE"])).toBe("Flexible, Fixed and Agile");
  });
});
