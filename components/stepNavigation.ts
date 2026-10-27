"use client";

import { useEffect, type RefObject } from "react";

/**
 * Focus management between journey steps.
 *
 * After moving to the next step inside the app, focus should go to the new
 * step's heading so screen reader users hear where they are. On a fresh page
 * load it should not, so keyboard users still meet the skip link first.
 *
 * Code that navigates between steps calls `markStepNavigation()` just before
 * `router.push`. The next step heading to mount consumes the flag and takes
 * focus. Using a one-shot flag (rather than "not the first render") keeps
 * this correct under React Strict Mode, which runs effects twice.
 */
let pendingStepFocus = false;

export function markStepNavigation() {
  pendingStepFocus = true;
}

export function useStepFocus(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!pendingStepFocus) return;
    pendingStepFocus = false;
    ref.current?.focus();
  }, [ref]);
}
