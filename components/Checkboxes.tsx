"use client";

import type { ReactNode } from "react";
import styles from "./form.module.css";

export type CheckboxItem<T extends string> = {
  value: T;
  label: ReactNode;
  hint?: ReactNode;
};

type CheckboxesProps<T extends string> = {
  id: string;
  name: string;
  legend: ReactNode;
  hint?: ReactNode;
  items: readonly CheckboxItem<T>[];
  values: readonly T[];
  onChange: (values: T[]) => void;
};

/** Native checkboxes in a fieldset. Ticking none is a valid answer. */
export function Checkboxes<T extends string>({
  id,
  name,
  legend,
  hint,
  items,
  values,
  onChange,
}: CheckboxesProps<T>) {
  const hintId = `${id}-hint`;

  function toggle(value: T, checked: boolean) {
    // Keep the original order, so saved answers are stable.
    onChange(
      items
        .map((item) => item.value)
        .filter((itemValue) =>
          itemValue === value ? checked : values.includes(itemValue),
        ),
    );
  }

  return (
    <div className={styles.field}>
      <fieldset className={styles.fieldset} aria-describedby={hint ? hintId : undefined}>
        <legend className={styles.legend}>{legend}</legend>
        {hint ? (
          <div id={hintId} className={styles.hint}>
            {hint}
          </div>
        ) : null}
        <div className={styles.choices}>
          {items.map((item, index) => {
            const itemId = index === 0 ? id : `${id}-${item.value}`;
            const itemHintId = `${itemId}-item-hint`;
            return (
              <div key={item.value} className={styles.choice}>
                <input
                  id={itemId}
                  type="checkbox"
                  name={name}
                  value={item.value}
                  checked={values.includes(item.value)}
                  onChange={(event) => toggle(item.value, event.target.checked)}
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
