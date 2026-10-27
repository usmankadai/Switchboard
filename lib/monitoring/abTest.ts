import { TARIFF_LAYOUTS, type TariffLayout } from "../experiments";
import type { FunnelCounts } from "./funnelStore";

/**
 * Reading the tariff layout A/B test (ADR 3): did more people choose a
 * tariff from the cards or from the table? Pure maths, unit tested.
 *
 * Conversion = sessions that chose a tariff ÷ sessions that saw the tariffs
 * step, per layout. Compared with a two-proportion z-test.
 */

/** Below this, any difference is too likely to be chance to report. */
export const MIN_SESSIONS_PER_VARIANT = 100;

/** 5% chance of calling a difference that is not really there. */
export const SIGNIFICANCE_LEVEL = 0.05;

/** The smallest change worth detecting when planning: 5 percentage points. */
export const PLANNED_DIFFERENCE = 0.05;

export const LAYOUT_LABELS: Record<TariffLayout, string> = {
  cards: "Cards (control)",
  table: "Comparison table",
};

/**
 * Standard normal cumulative distribution, via the Abramowitz and Stegun
 * approximation of erf (formula 7.1.26, accurate to about 1.5e-7).
 */
export function normalCdf(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

export type Proportion = { sessions: number; conversions: number };

/**
 * Two-sided two-proportion z-test with a pooled standard error.
 * Returns null when there is nothing to compare.
 */
export function twoProportionTest(a: Proportion, b: Proportion): { z: number; pValue: number } | null {
  if (a.sessions === 0 || b.sessions === 0) return null;
  const pooled = (a.conversions + b.conversions) / (a.sessions + b.sessions);
  const standardError = Math.sqrt(pooled * (1 - pooled) * (1 / a.sessions + 1 / b.sessions));
  if (standardError === 0) return { z: 0, pValue: 1 };
  const z = (b.conversions / b.sessions - a.conversions / a.sessions) / standardError;
  return { z, pValue: 2 * (1 - normalCdf(Math.abs(z))) };
}

/**
 * Sessions needed in each group to detect a change of `difference` from a
 * `baseline` rate, with 80% power at 5% significance (two-sided).
 */
export function sampleSizePerVariant(baseline: number, difference = PLANNED_DIFFERENCE): number {
  const zAlpha = 1.959964; // 5% two-sided
  const zPower = 0.841621; // 80% power
  const p1 = baseline;
  const p2 = Math.min(0.999, Math.max(0.001, baseline + difference));
  const average = (p1 + p2) / 2;
  const numerator =
    zAlpha * Math.sqrt(2 * average * (1 - average)) + zPower * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
  return Math.ceil((numerator * numerator) / ((p2 - p1) * (p2 - p1)));
}

export type VariantResult = Proportion & { layout: TariffLayout; label: string; rate: number | null };

export type ExperimentVerdict =
  | "not-enough-data"
  | "no-clear-difference"
  | "table-better"
  | "cards-better";

export type ExperimentReport = {
  variants: VariantResult[];
  /** Table rate minus cards rate, in proportion terms (0.05 = 5 points). */
  difference: number | null;
  pValue: number | null;
  verdict: ExperimentVerdict;
  /** Planned sessions per layout to detect a 5 point change. */
  plannedSessionsPerVariant: number;
};

export function analyseTariffLayoutTest(experiment: FunnelCounts["experiment"]): ExperimentReport {
  const variants: VariantResult[] = TARIFF_LAYOUTS.map((layout) => {
    const sessions = experiment[layout].viewed;
    // A choice without a recorded view (for example a resumed page) cannot
    // count twice: conversions never exceed sessions.
    const conversions = Math.min(experiment[layout].completed, sessions);
    return {
      layout,
      label: LAYOUT_LABELS[layout],
      sessions,
      conversions,
      rate: sessions > 0 ? conversions / sessions : null,
    };
  });

  const [cards, table] = variants as [VariantResult, VariantResult];
  const test = twoProportionTest(cards, table);
  const difference = cards.rate !== null && table.rate !== null ? table.rate - cards.rate : null;
  // Plan from the control's observed rate, or 50% (the most conservative) before there is one.
  const plannedSessionsPerVariant = sampleSizePerVariant(cards.rate ?? 0.5);

  let verdict: ExperimentVerdict = "not-enough-data";
  if (cards.sessions >= MIN_SESSIONS_PER_VARIANT && table.sessions >= MIN_SESSIONS_PER_VARIANT && test) {
    if (test.pValue >= SIGNIFICANCE_LEVEL) verdict = "no-clear-difference";
    else verdict = (difference ?? 0) > 0 ? "table-better" : "cards-better";
  }

  return { variants, difference, pValue: test?.pValue ?? null, verdict, plannedSessionsPerVariant };
}

const oneDecimal = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

/** 0.0074 → "p = 0.007", 0.00001 → "p < 0.001" */
export function formatPValue(pValue: number): string {
  return pValue < 0.001 ? "p < 0.001" : `p = ${pValue.toFixed(3)}`;
}

/** 0.05 → "5 percentage points" */
export function formatPoints(difference: number): string {
  const points = Math.abs(difference) * 100;
  return `${oneDecimal.format(points)} percentage ${points === 1 ? "point" : "points"}`;
}

/** The result in one plain sentence, careful not to overclaim. */
export function describeVerdict(report: ExperimentReport): string {
  const { verdict, difference, pValue } = report;
  if (verdict === "not-enough-data" || difference === null || pValue === null) {
    return `Not enough data yet. Each layout needs at least ${MIN_SESSIONS_PER_VARIANT} sessions before the result means anything.`;
  }
  if (verdict === "no-clear-difference") {
    return `No clear difference yet (${formatPValue(pValue)}). The gap could easily be chance.`;
  }
  const winner = verdict === "table-better" ? "The comparison table" : "The cards";
  return `${winner} is ahead by ${formatPoints(difference)}, and that is unlikely to be chance (${formatPValue(pValue)}).`;
}
