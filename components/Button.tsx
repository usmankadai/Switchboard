import type { ButtonHTMLAttributes } from "react";
import styles from "./form.module.css";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /**
   * While busy the button stays focusable (so focus is not lost) but ignores
   * clicks, and says what is happening.
   */
  busy?: boolean;
  busyLabel?: string;
};

export function Button({
  busy = false,
  busyLabel,
  children,
  type = "button",
  onClick,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[styles.button, className].filter(Boolean).join(" ")}
      aria-disabled={busy || undefined}
      onClick={(event) => {
        if (busy) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      {...rest}
    >
      {busy && busyLabel ? busyLabel : children}
    </button>
  );
}
