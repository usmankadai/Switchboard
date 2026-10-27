"use client";

import Link from "next/link";
import formStyles from "@/components/form.module.css";
import { StepHeading } from "@/components/StepHeading";
import { useSavedJourney } from "@/components/useSavedJourney";
import { REGION_NAMES } from "@/lib/regions";
import { stepCaption } from "../steps";

/**
 * Placeholder for the usage step. It confirms the region saved by the
 * postcode step so the journey can be followed end to end while the usage
 * questions are built.
 */
export function UsageStep() {
  const journey = useSavedJourney();
  const regionName = journey?.regionCode
    ? REGION_NAMES[journey.regionCode]
    : undefined;

  return (
    <>
      <Link href="/postcode" className={formStyles.backLink}>
        Back
      </Link>
      <p className={formStyles.caption}>{stepCaption("/usage")}</p>
      <StepHeading>How much electricity do you use?</StepHeading>

      {journey === null ? null : regionName ? (
        <div className={formStyles.panel}>
          <p>
            Your region: <strong>{regionName}</strong>.{" "}
            <Link href="/postcode">
              Change<span className="visually-hidden"> your postcode</span>
            </Link>
          </p>
        </div>
      ) : (
        <div className={formStyles.panel}>
          <p>
            We need your postcode first.{" "}
            <Link href="/postcode">Enter your postcode</Link>
          </p>
        </div>
      )}

      <p>The usage questions are coming next.</p>
    </>
  );
}
