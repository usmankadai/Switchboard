"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ErrorSummary, type FormError } from "@/components/ErrorSummary";
import formStyles from "@/components/form.module.css";
import { StepHeading } from "@/components/StepHeading";
import { useFunnelStep } from "@/components/useFunnelStep";
import { useSavedJourney } from "@/components/useSavedJourney";
import { describeCost } from "@/lib/comparison";
import { REGION_NAMES } from "@/lib/regions";
import { stepCaption } from "../steps";
import { useTariffComparison } from "../tariffs/useTariffComparison";
import { SignupForm } from "./SignupForm";

const PAGE_TITLE = "Sign up | Switchboard";

/** Step 4. Heading and error summary sit above the form, as on the other steps. */
export function SignupStep() {
  const journey = useSavedJourney();
  useFunnelStep("signup");
  // Reads from Apollo's cache after the comparison, so no extra request.
  const { data } = useTariffComparison(journey);
  const [errors, setErrors] = useState<FormError[]>([]);
  const [submitCount, setSubmitCount] = useState(0);

  useEffect(() => {
    document.title = errors.length > 0 ? `Error: ${PAGE_TITLE}` : PAGE_TITLE;
  }, [errors]);

  const chosen = data?.tariffComparison.quotes.find((quote) => quote.id === journey?.tariffId);
  const regionCode = journey?.regionCode;
  const tariffId = journey?.tariffId;

  return (
    <>
      <Link href="/tariffs" className={formStyles.backLink}>
        Back
      </Link>
      <ErrorSummary errors={errors} submitCount={submitCount} />
      <p className={formStyles.caption}>{stepCaption("/signup")}</p>
      <StepHeading>Your details</StepHeading>

      {journey === null ? null : regionCode && tariffId ? (
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
          <SignupForm
            regionCode={regionCode}
            regionName={REGION_NAMES[regionCode] ?? regionCode}
            tariffId={tariffId}
            errors={errors}
            onInvalid={(next) => {
              setErrors(next);
              setSubmitCount((count) => count + 1);
            }}
            onErrorsChange={setErrors}
          />
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
