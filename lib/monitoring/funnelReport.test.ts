import { describe, expect, it } from "vitest";
import { FUNNEL_DETAILS, FUNNEL_STEPS, type FunnelDetail, type FunnelStep } from "./funnel";
import { buildFunnelReport, formatShare } from "./funnelReport";
import type { FunnelCounts } from "./funnelStore";

function counts(
  viewed: Partial<Record<FunnelStep, number>>,
  details: Partial<Record<FunnelDetail, number>> = {},
): FunnelCounts {
  return {
    steps: Object.fromEntries(
      FUNNEL_STEPS.map((step) => [step, { viewed: viewed[step] ?? 0, completed: 0 }]),
    ) as FunnelCounts["steps"],
    details: Object.fromEntries(
      FUNNEL_DETAILS.map((detail) => [detail, details[detail] ?? 0]),
    ) as FunnelCounts["details"],
    experiment: { cards: { viewed: 0, completed: 0 }, table: { viewed: 0, completed: 0 } },
  };
}

describe("buildFunnelReport", () => {
  const report = buildFunnelReport(
    counts(
      { postcode: 200, usage: 160, tariffs: 150, signup: 60, confirmation: 45 },
      { "usage-known": 30, "usage-estimate": 120, "tariff-fixed": 20, "tariff-agile": 40 },
    ),
  );

  it("works out conversion from start to finish", () => {
    expect(report.started).toBe(200);
    expect(report.finished).toBe(45);
    expect(report.conversion).toBe(0.225);
  });

  it("gives each step's share of the start and of the step before", () => {
    expect(report.steps[1]).toMatchObject({ label: "Usage", sessions: 160, shareOfStart: 0.8, fromPrevious: 0.8 });
    expect(report.steps[3]).toMatchObject({ label: "Sign up", shareOfStart: 0.3, fromPrevious: 0.4 });
    expect(report.steps[0]?.fromPrevious).toBeNull();
  });

  it("finds the biggest drop-off between steps", () => {
    expect(report.biggestDropOff).toEqual({ from: "Compare tariffs", to: "Sign up", lost: 90, share: 0.6 });
  });

  it("splits how people answered and what they chose", () => {
    expect(report.usageMethods).toEqual([
      { label: "Entered a figure from a bill", sessions: 30, share: 0.2 },
      { label: "Used the estimate", sessions: 120, share: 0.8 },
    ]);
    expect(report.tariffChoices.find((item) => item.label === "Agile")?.share).toBeCloseTo(2 / 3);
  });

  it("never lets a step exceed the one before (for example, a resumed journey)", () => {
    const resumed = buildFunnelReport(counts({ postcode: 10, usage: 14, tariffs: 12 }));
    expect(resumed.steps.map((step) => step.sessions)).toEqual([10, 10, 10, 0, 0]);
  });

  it("copes with no data at all", () => {
    const empty = buildFunnelReport(counts({}));
    expect(empty.conversion).toBeNull();
    expect(empty.biggestDropOff).toBeNull();
    expect(empty.usageMethods.every((item) => item.share === null)).toBe(true);
  });
});

describe("formatShare", () => {
  it("formats percentages and gaps", () => {
    expect(formatShare(0.225)).toBe("23%");
    expect(formatShare(null)).toBe("–");
  });
});
