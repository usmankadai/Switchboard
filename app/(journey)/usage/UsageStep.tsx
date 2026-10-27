"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ErrorSummary, type FormError } from "@/components/ErrorSummary";
import formStyles from "@/components/form.module.css";
import { StepHeading } from "@/components/StepHeading";
import { useSavedJourney } from "@/components/useSavedJourney";
import { REGION_NAMES } from "@/lib/regions";
import { formValuesFromSaved } from "@/lib/usage-form";
import { stepCaption } from "../steps";
import { UsageForm } from "./UsageForm";

const PAGE_TITLE = "Your usage | Switchboard";

/**
 * Step 2. The heading and error summary live here, above the form, so the
 * page order matches GOV.UK: back link, error summary, caption, heading.
 */
export function UsageStep() {
  const journey = useSavedJourney();
  const [errors, setErrors] = useState<FormError[]>([]);
  const [submitCount, setSubmitCount] = useState(0);

  useEffect(() => {
    document.title = errors.length > 0 ? `Error: ${PAGE_TITLE}` : PAGE_TITLE;
  }, [errors]);

  const regionName = journey?.regionCode
    ? REGION_NAMES[journey.regionCode]
    : undefined;

  return (
    <>
      <Link href="/postcode" className={formStyles.backLink}>
        Back
      </Link>
      <ErrorSummary errors={errors} submitCount={submitCount} />
      <p className={formStyles.caption}>{stepCaption("/usage")}</p>
      <StepHeading>How much electricity do you use?</StepHeading>

      {/* Nothing until storage has been read, to avoid a flash of the wrong state. */}
      {journey === null ? null : regionName ? (
        <>
          <p>
            Your region: <strong>{regionName}</strong>.{" "}
            <Link href="/postcode">
              Change{" "}
              <span className="visually-hidden">your postcode</span>
            </Link>
          </p>
          <UsageForm
            initialValues={formValuesFromSaved(journey.usage, journey.annualKwh)}
            onInvalid={(next) => {
              setErrors(next);
              setSubmitCount((count) => count + 1);
            }}
            onClearErrors={() => setErrors([])}
            errors={errors}
          />
        </>
      ) : (
        <div className={formStyles.panel}>
          <p>
            We need your postcode first.{" "}
            <Link href="/postcode">Enter your postcode</Link>
          </p>
        </div>
      )}
    </>
  );
}
