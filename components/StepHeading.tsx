"use client";

import { useRef, type ReactNode } from "react";
import styles from "./form.module.css";
import { useStepFocus } from "./stepNavigation";

/** A step's h1. Takes focus after moving between steps (see stepNavigation). */
export function StepHeading({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useStepFocus(ref);

  return (
    <h1 ref={ref} tabIndex={-1} className={styles.heading}>
      {children}
    </h1>
  );
}
