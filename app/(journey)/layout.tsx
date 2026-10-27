import styles from "./journey.module.css";

/** Shared frame for every quote and signup step. */
export default function JourneyLayout({ children }: LayoutProps<"/">) {
  return <div className={`container ${styles.journey}`}>{children}</div>;
}
