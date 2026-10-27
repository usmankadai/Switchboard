"use client";

import Link from "next/link";
import formStyles from "@/components/form.module.css";
import { StepHeading } from "@/components/StepHeading";
import { useSavedJourney } from "@/components/useSavedJourney";
import { REGION_NAMES } from "@/lib/regions";
import { formatKwh } from "@/lib/usage";
import { stepCaption } from "../steps";

/**
 * Placeholder for the tariff comparison. It shows the answers so far, with
 * change links, so the journey can be followed end to end while the
 * comparison is built.
 */
export function TariffsStep() {
  const journey = useSavedJourney();
  const regionName = journey?.regionCode
    ? REGION_NAMES[journey.regionCode]
    : undefined;
  const annualKwh = journey?.annualKwh;
  const isEstimate = journey?.usage?.method === "estimate";

  return (
    <>
      <Link href="/usage" className={formStyles.backLink}>
        Back
      </Link>
      <p className={formStyles.caption}>{stepCaption("/tariffs")}</p>
      <StepHeading>Compare tariffs</StepHeading>

      {journey === null ? null : regionName && annualKwh ? (
        <>
          <dl className={formStyles.summaryList}>
            <div className={formStyles.summaryRow}>
              <dt>Region</dt>
              <dd>{regionName}</dd>
              <dd>
                <Link href="/postcode">
                  Change{" "}
                  <span className="visually-hidden">region</span>
                </Link>
              </dd>
            </div>
            <div className={formStyles.summaryRow}>
              <dt>Yearly usage</dt>
              <dd>
                {formatKwh(annualKwh)}
                {isEstimate ? " (estimated)" : ""}
              </dd>
              <dd>
                <Link href="/usage">
                  Change{" "}
                  <span className="visually-hidden">yearly usage</span>
                </Link>
              </dd>
            </div>
          </dl>
          <p>The tariff comparison is coming next.</p>
        </>
      ) : (
        <div className={formStyles.panel}>
          <p>
            We need a few answers first.{" "}
            <Link href={regionName ? "/usage" : "/postcode"}>
              {regionName ? "Tell us your usage" : "Enter your postcode"}
            </Link>
          </p>
        </div>
      )}
    </>
  );
}
