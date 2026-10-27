"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import styles from "./form.module.css";
import { StepHeading } from "./StepHeading";

type TextInputProps = {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  /**
   * For one-question pages, the label is also the page's h1 (the GOV.UK
   * pattern), so the question is not read out twice.
   */
  isPageHeading?: boolean;
  /** Width in characters, so the box hints at the expected length. */
  widthChars?: number;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "aria-describedby" | "aria-invalid">;

export function TextInput({
  id,
  label,
  hint,
  error,
  isPageHeading = false,
  widthChars,
  className,
  ...inputProps
}: TextInputProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ");

  const labelElement = (
    <label
      htmlFor={id}
      className={isPageHeading ? styles.labelHeading : styles.label}
    >
      {label}
    </label>
  );

  return (
    <div className={error ? `${styles.field} ${styles.fieldError}` : styles.field}>
      {isPageHeading ? <StepHeading>{labelElement}</StepHeading> : labelElement}
      {hint ? (
        <div id={hintId} className={styles.hint}>
          {hint}
        </div>
      ) : null}
      {error ? (
        <p id={errorId} className={styles.errorMessage}>
          {/* The space sits outside the span: whitespace inside hidden text is trimmed. */}
          <span className="visually-hidden">Error:</span> {error}
        </p>
      ) : null}
      <input
        id={id}
        type="text"
        className={[styles.input, className].filter(Boolean).join(" ")}
        style={widthChars ? { maxWidth: `${widthChars + 2}ch` } : undefined}
        aria-describedby={describedBy || undefined}
        aria-invalid={error ? true : undefined}
        {...inputProps}
      />
    </div>
  );
}
