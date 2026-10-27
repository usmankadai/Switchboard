"use client";

import type { ReactNode } from "react";
import styles from "./form.module.css";

export type RadioItem<T extends string> = {
  value: T;
  label: ReactNode;
  hint?: ReactNode;
};

type RadiosProps<T extends string> = {
  /** Used for the first option's id, so error summary links land on it. */
  id: string;
  name: string;
  legend: ReactNode;
  hint?: ReactNode;
  error?: string;
  items: readonly RadioItem<T>[];
  value: T | "";
  onChange: (value: T) => void;
};

/**
 * Native radios in a fieldset. The first option carries `id`, as GOV.UK does.
 * Follow-up questions go after the fieldset, not nested inside it: nested
 * fieldsets are announced confusingly by screen readers.
 */
export function Radios<T extends string>({
  id,
  name,
  legend,
  hint,
  error,
  items,
  value,
  onChange,
}: RadiosProps<T>) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={error ? `${styles.field} ${styles.fieldError}` : styles.field}>
      <fieldset className={styles.fieldset} aria-describedby={describedBy || undefined}>
        <legend className={styles.legend}>{legend}</legend>
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

        <div className={styles.choices}>
          {items.map((item, index) => {
            const itemId = index === 0 ? id : `${id}-${item.value}`;
            const itemHintId = `${itemId}-item-hint`;
            return (
              <div key={item.value} className={styles.choice}>
                <input
                  id={itemId}
                  type="radio"
                  name={name}
                  value={item.value}
                  checked={value === item.value}
                  onChange={() => onChange(item.value)}
                  aria-describedby={item.hint ? itemHintId : undefined}
                  className={styles.choiceInput}
                />
                <label htmlFor={itemId} className={styles.choiceLabel}>
                  {item.label}
                  {item.hint ? (
                    <span id={itemHintId} className={styles.choiceHint}>
                      {item.hint}
                    </span>
                  ) : null}
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
