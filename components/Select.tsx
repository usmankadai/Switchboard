"use client";

import type { ReactNode, SelectHTMLAttributes } from "react";
import styles from "./form.module.css";

type SelectProps = {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  options: readonly { value: string; label: string }[];
  /** First, unselectable line, for example "5 addresses found". */
  placeholder: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "aria-describedby" | "aria-invalid">;

export function Select({ id, label, hint, error, options, placeholder, ...selectProps }: SelectProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <div className={error ? `${styles.field} ${styles.fieldError}` : styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {hint ? (
        <div id={hintId} className={styles.hint}>
          {hint}
        </div>
      ) : null}
      {error ? (
        <p id={errorId} className={styles.errorMessage}>
          <span className="visually-hidden">Error:</span> {error}
        </p>
      ) : null}
      <select
        id={id}
        className={styles.select}
        aria-describedby={describedBy || undefined}
        aria-invalid={error ? true : undefined}
        {...selectProps}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
