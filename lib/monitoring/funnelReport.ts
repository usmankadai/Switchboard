import { FUNNEL_STEPS, type FunnelDetail, type FunnelStep } from "./funnel";
import type { FunnelCounts } from "./funnelStore";

/**
 * Turns distinct-session counts into the numbers the dashboard shows:
 * how many reached each step, how many left between steps, and where the
 * biggest drop-off is. Pure, so it is unit tested.
 */

export const STEP_LABELS: Record<FunnelStep, string> = {
  postcode: "Postcode",
  usage: "Usage",
  tariffs: "Compare tariffs",
  signup: "Sign up",
  confirmation: "Confirmation",
};

export type FunnelStepReport = {
  step: FunnelStep;
  label: string;
  /** Distinct sessions that saw this step. */
  sessions: number;
  /** Share of sessions that started the journey. */
  shareOfStart: number | null;
  /** Share of the previous step's sessions that reached this one. */
  fromPrevious: number | null;
};

export type SplitItem = { label: string; sessions: number; share: number | null };

export type FunnelReport = {
  started: number;
  finished: number;
  conversion: number | null;
  steps: FunnelStepReport[];
  biggestDropOff: { from: string; to: string; lost: number; share: number } | null;
  usageMethods: SplitItem[];
  tariffChoices: SplitItem[];
};

const share = (part: number, whole: number) => (whole > 0 ? part / whole : null);

function split(counts: FunnelCounts, items: [FunnelDetail, string][]): SplitItem[] {
  const total = items.reduce((sum, [detail]) => sum + counts.details[detail], 0);
  return items.map(([detail, label]) => ({
    label,
    sessions: counts.details[detail],
    share: share(counts.details[detail], total),
  }));
}

export function buildFunnelReport(counts: FunnelCounts): FunnelReport {
  // A step's sessions are those that viewed it. People can reach a later
  // step without a recorded view of an earlier one (for example, resuming
  // a saved journey), so never let a step exceed the one before.
  let previous = Infinity;
  const sessionsByStep = FUNNEL_STEPS.map((step) => {
    const sessions = Math.min(counts.steps[step].viewed, previous);
    previous = sessions;
    return sessions;
  });

  const started = sessionsByStep[0] ?? 0;
  const finished = sessionsByStep.at(-1) ?? 0;

  const steps = FUNNEL_STEPS.map((step, index) => ({
    step,
    label: STEP_LABELS[step],
    sessions: sessionsByStep[index]!,
    shareOfStart: share(sessionsByStep[index]!, started),
    fromPrevious: index === 0 ? null : share(sessionsByStep[index]!, sessionsByStep[index - 1]!),
  }));

  let biggestDropOff: FunnelReport["biggestDropOff"] = null;
  for (let index = 1; index < steps.length; index++) {
    const before = steps[index - 1]!;
    const after = steps[index]!;
    const lost = before.sessions - after.sessions;
    if (lost > 0 && (biggestDropOff === null || lost > biggestDropOff.lost)) {
      biggestDropOff = { from: before.label, to: after.label, lost, share: lost / before.sessions };
    }
  }

  return {
    started,
    finished,
    conversion: share(finished, started),
    steps,
    biggestDropOff,
    usageMethods: split(counts, [
      ["usage-known", "Entered a figure from a bill"],
      ["usage-estimate", "Used the estimate"],
    ]),
    tariffChoices: split(counts, [
      ["tariff-flexible", "Flexible"],
      ["tariff-fixed", "Fixed"],
      ["tariff-tracker", "Tracker"],
      ["tariff-agile", "Agile"],
    ]),
  };
}

const percent = new Intl.NumberFormat("en-GB", { style: "percent", maximumFractionDigits: 0 });

/** 0.4123 → "41%", null → "–" */
export function formatShare(value: number | null): string {
  return value === null ? "–" : percent.format(value);
}
