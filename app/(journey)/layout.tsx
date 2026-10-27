import { ApolloWrapper } from "../ApolloWrapper";
import styles from "./journey.module.css";

/**
 * Shared frame for every quote and signup step. Apollo is provided here, not
 * in the root layout, so the landing page does not download it.
 */
export default function JourneyLayout({ children }: LayoutProps<"/">) {
  return (
    <ApolloWrapper>
      <div className={`container ${styles.journey}`}>{children}</div>
    </ApolloWrapper>
  );
}
