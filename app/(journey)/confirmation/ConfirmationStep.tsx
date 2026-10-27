"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import formStyles from "@/components/form.module.css";
import { StepHeading } from "@/components/StepHeading";
import { useSavedJourney } from "@/components/useSavedJourney";
import { describeCost } from "@/lib/comparison";
import { clearJourney } from "@/lib/journey-storage";
import { useTariffComparison } from "../tariffs/useTariffComparison";

export function ConfirmationStep() {
  const router = useRouter();
  const journey = useSavedJourney();
  const { data } = useTariffComparison(journey);
  const chosen = data?.tariffComparison.quotes.find((quote) => quote.id === journey?.tariffId);

  function startAgain() {
    clearJourney();
    router.push("/");
  }

  if (journey === null) return null;

  if (!journey.reference) {
    return (
      <>
        <StepHeading>There is nothing to confirm yet</StepHeading>
        <p>
          <Link href="/postcode">Start a quote</Link> to compare tariffs and switch.
        </p>
      </>
    );
  }

  return (
    <>
      <div className={formStyles.confirmationPanel}>
        <StepHeading>Switch request received</StepHeading>
        <p>
          Your reference number
          <strong className={formStyles.reference}>{journey.reference}</strong>
        </p>
      </div>

      {chosen ? (
        <p>
          You chose <strong>{chosen.displayName}</strong>, estimated at{" "}
          {describeCost(chosen.estimatedAnnualCostPence).yearly}.
        </p>
      ) : null}

      <h2>This was a demo</h2>
      <p>
        Nothing has been sent, no account was created and your energy supply has not
        changed. Your name and email were checked, then thrown away.
      </p>

      <h2>What would happen next</h2>
      <p>
        In a real switch you would get a confirmation email, and your supply would move
        over within about 5 working days. Your power would stay on throughout.
      </p>

      <Button variant="secondary" onClick={startAgain}>
        Start again
      </Button>
    </>
  );
}
