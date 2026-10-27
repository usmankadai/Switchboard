"use client";

import Link from "next/link";
import formStyles from "@/components/form.module.css";
import { StepHeading } from "@/components/StepHeading";
import { useSavedJourney } from "@/components/useSavedJourney";
import { describeCost } from "@/lib/comparison";
import { stepCaption } from "../steps";
import { useTariffComparison } from "../tariffs/useTariffComparison";

/**
 * Placeholder for the signup form. It confirms the chosen tariff (read from
 * Apollo's cache after the comparison, so no extra request) so the journey
 * can be followed end to end while the form is built.
 */
export function SignupStep() {
  const journey = useSavedJourney();
  const { data } = useTariffComparison(journey);
  const chosen = data?.tariffComparison.quotes.find(
    (quote) => quote.id === journey?.tariffId,
  );

  return (
    <>
      <Link href="/tariffs" className={formStyles.backLink}>
        Back
      </Link>
      <p className={formStyles.caption}>{stepCaption("/signup")}</p>
      <StepHeading>Sign up</StepHeading>

      {journey === null ? null : journey.tariffId ? (
        <>
          {chosen ? (
            <div className={formStyles.panel}>
              <p>
                You chose <strong>{chosen.displayName}</strong>, estimated at{" "}
                {describeCost(chosen.estimatedAnnualCostPence).yearly}.{" "}
                <Link href="/tariffs">
                  Change{" "}
                  <span className="visually-hidden">tariff</span>
                </Link>
              </p>
            </div>
          ) : null}
          <p>The signup form is coming next.</p>
        </>
      ) : (
        <div className={formStyles.panel}>
          <p>
            Choose a tariff first. <Link href="/tariffs">Compare tariffs</Link>
          </p>
        </div>
      )}
    </>
  );
}
