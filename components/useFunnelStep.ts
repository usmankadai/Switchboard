"use client";

import { useEffect } from "react";
import { trackFunnel, type FunnelStep } from "@/lib/monitoring/funnel";

/**
 * Records that a step was viewed. Runs again when someone comes back to a
 * step (Next.js re-runs effects when it shows a preserved page), which is
 * what we want: going back is part of the funnel.
 */
export function useFunnelStep(step: FunnelStep) {
  useEffect(() => {
    trackFunnel(step, "viewed");
  }, [step]);
}
