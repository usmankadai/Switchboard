"use client";

import { useEffect, useId, useRef, type MouseEvent } from "react";
import styles from "./form.module.css";

export type FormError = {
  message: string;
  /** The id of the field to link to. Omit for errors not tied to a field. */
  fieldId?: string;
};

/**
 * GOV.UK style error summary. Shown at the top of a form after a failed
 * submit, it takes focus so screen readers announce it, and each error links
 * to its field.
 *
 * `submitCount` should go up on every failed submit, so the summary takes
 * focus again even when the errors are the same as last time.
 */
export function ErrorSummary({
  errors,
  submitCount,
}: {
  errors: readonly FormError[];
  submitCount: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Unique per instance: Next.js keeps recent pages in the DOM (hidden), so a
  // fixed id could clash with another step's summary.
  const titleId = useId();

  useEffect(() => {
    if (errors.length > 0) ref.current?.focus();
  }, [errors, submitCount]);

  if (errors.length === 0) return null;

  function focusField(event: MouseEvent<HTMLAnchorElement>, fieldId: string) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    event.preventDefault();
    // Bring the label into view too, not just the input.
    const label = document.querySelector(`label[for="${CSS.escape(fieldId)}"]`);
    (label ?? field).scrollIntoView({ block: "center" });
    field.focus({ preventScroll: true });
  }

  return (
    <div
      ref={ref}
      className={styles.errorSummary}
      aria-labelledby={titleId}
      tabIndex={-1}
    >
      <h2 id={titleId} className={styles.errorSummaryTitle}>
        There is a problem
      </h2>
      <ul className={styles.errorSummaryList}>
        {errors.map((error) => (
          <li key={`${error.fieldId ?? "form"}-${error.message}`}>
            {error.fieldId ? (
              <a
                href={`#${error.fieldId}`}
                onClick={(event) => focusField(event, error.fieldId!)}
              >
                {error.message}
              </a>
            ) : (
              error.message
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
