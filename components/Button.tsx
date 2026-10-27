import type { ButtonHTMLAttributes } from "react";
import styles from "./form.module.css";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /**
   * While busy the button stays focusable (so focus is not lost) but ignores
   * clicks, and says what is happening.
   */
  busy?: boolean;
  busyLabel?: string;
  variant?: "primary" | "secondary";
};

export function Button({
  busy = false,
  busyLabel,
  variant = "primary",
  children,
  type = "button",
  onClick,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[styles.button, variant === "secondary" ? styles.buttonSecondary : null, className]
        .filter(Boolean)
        .join(" ")}
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
