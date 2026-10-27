import { describe, expect, it } from "vitest";
import {
  analyseTariffLayoutTest,
  describeVerdict,
  formatPValue,
  normalCdf,
  sampleSizePerVariant,
  twoProportionTest,
} from "./abTest";

const experiment = (cards: [number, number], table: [number, number]) => ({
  cards: { viewed: cards[0], completed: cards[1] },
  table: { viewed: table[0], completed: table[1] },
});

describe("normalCdf", () => {
  it("matches standard normal table values", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1.959964)).toBeCloseTo(0.975, 5);
    expect(normalCdf(-1.644854)).toBeCloseTo(0.05, 5);
    expect(normalCdf(3)).toBeCloseTo(0.99865, 5);
  });
});

describe("twoProportionTest", () => {
  it("gives the textbook answer for 200/1000 against 250/1000", () => {
    // Pooled p = 0.225, SE = sqrt(0.225 × 0.775 × 2 / 1000) ≈ 0.018675, z ≈ 2.677
    const result = twoProportionTest({ sessions: 1000, conversions: 200 }, { sessions: 1000, conversions: 250 });
    expect(result?.z).toBeCloseTo(2.677, 2);
    expect(result?.pValue).toBeCloseTo(0.0074, 3);
  });

  it("finds no difference between equal rates", () => {
    expect(twoProportionTest({ sessions: 500, conversions: 100 }, { sessions: 400, conversions: 80 })?.pValue).toBeCloseTo(1, 6);
  });

  it("copes with no sessions and with every session converting", () => {
    expect(twoProportionTest({ sessions: 0, conversions: 0 }, { sessions: 10, conversions: 5 })).toBeNull();
    expect(twoProportionTest({ sessions: 10, conversions: 10 }, { sessions: 10, conversions: 10 })).toEqual({ z: 0, pValue: 1 });
  });
});

describe("sampleSizePerVariant", () => {
  it("agrees with standard calculators: 50% baseline, 5 point change, about 1,565 per group", () => {
    const n = sampleSizePerVariant(0.5, 0.05);
    expect(n).toBeGreaterThan(1550);
    expect(n).toBeLessThan(1580);
  });

  it("needs fewer sessions to spot a bigger change", () => {
    expect(sampleSizePerVariant(0.4, 0.1)).toBeLessThan(sampleSizePerVariant(0.4, 0.05));
  });
});

describe("analyseTariffLayoutTest", () => {
  it("waits for enough data before saying anything", () => {
    const report = analyseTariffLayoutTest(experiment([40, 10], [40, 30]));
    expect(report.verdict).toBe("not-enough-data");
    expect(report.variants.map((variant) => variant.rate)).toEqual([0.25, 0.75]);
  });

  it("calls the table better when it is clearly better", () => {
    const report = analyseTariffLayoutTest(experiment([1000, 200], [1000, 250]));
    expect(report.verdict).toBe("table-better");
    expect(report.difference).toBeCloseTo(0.05, 10);
  });

  it("calls the cards better when they are clearly better", () => {
    expect(analyseTariffLayoutTest(experiment([1000, 250], [1000, 200])).verdict).toBe("cards-better");
  });

  it("says there is no clear difference when the gap could be chance", () => {
    const report = analyseTariffLayoutTest(experiment([300, 120], [300, 126]));
    expect(report.verdict).toBe("no-clear-difference");
    expect(report.pValue).toBeGreaterThan(0.05);
  });

  it("never counts more choices than views", () => {
    const report = analyseTariffLayoutTest(experiment([10, 15], [0, 0]));
    expect(report.variants[0]).toMatchObject({ conversions: 10, rate: 1 });
    expect(report.variants[1]?.rate).toBeNull();
  });

  it("plans the sample size from the control's rate, or 50% before there is one", () => {
    expect(analyseTariffLayoutTest(experiment([0, 0], [0, 0])).plannedSessionsPerVariant).toBe(
      sampleSizePerVariant(0.5),
    );
    expect(analyseTariffLayoutTest(experiment([200, 60], [10, 1])).plannedSessionsPerVariant).toBe(
      sampleSizePerVariant(0.3),
    );
  });
});

describe("describeVerdict", () => {
  it("says so plainly when there is not enough data", () => {
    expect(describeVerdict(analyseTariffLayoutTest(experiment([40, 10], [40, 30])))).toBe(
      "Not enough data yet. Each layout needs at least 100 sessions before the result means anything.",
    );
  });

  it("names the winner, the size of the gap and the p-value", () => {
    expect(describeVerdict(analyseTariffLayoutTest(experiment([1000, 200], [1000, 250])))).toBe(
      "The comparison table is ahead by 5 percentage points, and that is unlikely to be chance (p = 0.007).",
    );
  });

  it("does not overclaim a gap that could be chance", () => {
    expect(describeVerdict(analyseTariffLayoutTest(experiment([300, 120], [300, 126])))).toMatch(
      /^No clear difference yet \(p = 0\.\d{3}\)\. The gap could easily be chance\.$/,
    );
  });

  it("formats very small p-values", () => {
    expect(formatPValue(0.00001)).toBe("p < 0.001");
  });
});
