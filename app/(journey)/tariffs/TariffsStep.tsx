"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/Button";
import formStyles from "@/components/form.module.css";
import { markStepNavigation } from "@/components/stepNavigation";
import { StepHeading } from "@/components/StepHeading";
import { useFunnelStep } from "@/components/useFunnelStep";
import { useSavedJourney } from "@/components/useSavedJourney";
import { cheapestQuoteId, describeCheckedAt, describeKinds } from "@/lib/comparison";
import { saveJourney } from "@/lib/journey-storage";
import { trackFunnel, type FunnelDetail } from "@/lib/monitoring/funnel";
import { REGION_NAMES } from "@/lib/regions";
import { formatKwh } from "@/lib/usage";
import { stepCaption } from "../steps";
import { AgileExplainer } from "./AgileExplainer";
import { TariffCard } from "./TariffCard";
import styles from "./tariffs.module.css";
import { comparisonErrorMessage, useTariffComparison } from "./useTariffComparison";

export function TariffsStep() {
  const router = useRouter();
  const journey = useSavedJourney();
  useFunnelStep("tariffs");
  const { data, error, loading, refetch } = useTariffComparison(journey);
  const problemRef = useRef<HTMLDivElement>(null);
  const problemHeadingId = useId();

  const regionName = journey?.regionCode ? REGION_NAMES[journey.regionCode] : undefined;
  const annualKwh = journey?.annualKwh;
  const comparison = data?.tariffComparison;
  const showProblem = Boolean(error) && !loading;

  // Move focus to the problem so keyboard and screen reader users can retry.
  useEffect(() => {
    if (showProblem) problemRef.current?.focus();
  }, [showProblem]);

  function choose(tariffId: string) {
    saveJourney({ tariffId });
    const kind = comparison?.quotes.find((quote) => quote.id === tariffId)?.kind;
    trackFunnel(
      "tariffs",
      "completed",
      kind ? (`tariff-${kind.toLowerCase()}` as FunnelDetail) : undefined,
    );
    markStepNavigation();
    router.push("/signup");
  }

  const cheapest = comparison ? cheapestQuoteId(comparison.quotes) : null;
  const agile = comparison?.quotes.find((quote) => quote.kind === "AGILE");

  return (
    <>
      <Link href="/usage" className={formStyles.backLink}>
        Back
      </Link>
      <p className={formStyles.caption}>{stepCaption("/tariffs")}</p>
      <StepHeading>Compare tariffs</StepHeading>

      {journey === null ? null : !regionName || !annualKwh ? (
        <div className={formStyles.panel}>
          <p>
            We need a few answers first.{" "}
            <Link href={regionName ? "/usage" : "/postcode"}>
              {regionName ? "Tell us your usage" : "Enter your postcode"}
            </Link>
          </p>
        </div>
      ) : (
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
                {journey.usage?.method === "estimate" ? " (estimated)" : ""}
              </dd>
              <dd>
                <Link href="/usage">
                  Change{" "}
                  <span className="visually-hidden">yearly usage</span>
                </Link>
              </dd>
            </div>
          </dl>

          {/* Always in the page, so screen readers announce changes to it. */}
          <p role="status" className={loading ? styles.status : "visually-hidden"}>
            {loading ? "Checking today's prices…" : ""}
          </p>

          {showProblem ? (
            <div
              ref={problemRef}
              className={styles.problem}
              tabIndex={-1}
              aria-labelledby={problemHeadingId}
            >
              <h2 id={problemHeadingId}>Prices are not available</h2>
              <p>{comparisonErrorMessage(error)}</p>
              <Button onClick={() => void refetch().catch(() => undefined)}>
                Try again
              </Button>
            </div>
          ) : null}

          {comparison && !loading ? (
            <div className={styles.wide}>
              <p>
                Estimated yearly costs for {formatKwh(annualKwh)} a year in {regionName},
                including VAT. They are estimates, not quotes.
              </p>
              {comparison.unavailableKinds.length > 0 ? (
                <div className={formStyles.panel}>
                  <p>
                    We could not get prices for {describeKinds(comparison.unavailableKinds)} just
                    now. The others are below.
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => void refetch().catch(() => undefined)}
                  >
                    Try again
                  </Button>
                </div>
              ) : null}
              <ul className={styles.cards} aria-label="Tariffs">
                {comparison.quotes.map((quote) => (
                  <TariffCard
                    key={quote.id}
                    quote={quote}
                    isCheapest={quote.id === cheapest}
                    onChoose={choose}
                  />
                ))}
              </ul>
              {agile ? <AgileExplainer quote={agile} /> : null}
              <p className={styles.checkedAt}>
                {describeCheckedAt(comparison.pricesCheckedAt)}.
              </p>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
