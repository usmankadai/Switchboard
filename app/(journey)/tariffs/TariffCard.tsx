"use client";

import { useId } from "react";
import { Button } from "@/components/Button";
import { graphql, useFragment, type FragmentType } from "@/generated";
import {
  describeCost,
  describeExitFee,
  describeTerm,
} from "@/lib/comparison";
import { formatStandingCharge, formatUnitRate } from "@/lib/money";
import styles from "./tariffs.module.css";

export const TariffCardFragment = graphql(`
  fragment TariffCard_quote on TariffQuote {
    id
    kind
    displayName
    termMonths
    exitFeePence
    unitRatePence
    standingChargePencePerDay
    estimatedAnnualCostPence
    priceVaries
    recentPrices {
      days
    }
  }
`);

/** One line on what each kind of tariff means, without jargon. */
const KIND_DESCRIPTIONS = {
  FLEXIBLE: "A variable price that can go up or down, usually every 3 months.",
  FIXED: "Your unit rate and standing charge stay the same for the whole contract.",
  TRACKER: "The price changes each day, following wholesale energy costs.",
  AGILE: "The price changes every half hour. It is cheapest when demand is low, sometimes below zero.",
} as const;

/**
 * What a customer needs before they can choose a tariff. Agile bills every
 * half hour, so it needs a smart meter that sends half-hourly readings
 * (Octopus's Agile help page and terms).
 */
const REQUIREMENTS: Partial<Record<keyof typeof KIND_DESCRIPTIONS, string>> = {
  AGILE: "Needs a smart meter that sends half-hourly readings.",
};

type TariffCardProps = {
  quote: FragmentType<typeof TariffCardFragment>;
  isCheapest: boolean;
  onChoose: (id: string) => void;
};

export function TariffCard({ quote: quoteRef, isCheapest, onChoose }: TariffCardProps) {
  const quote = useFragment(TariffCardFragment, quoteRef);
  const headingId = useId();
  const cost = describeCost(quote.estimatedAnnualCostPence);

  return (
    <li className={styles.card} aria-labelledby={headingId}>
      {isCheapest ? (
        // Text, not just colour, so the label is not lost on anyone.
        <p className={styles.badge}>Lowest estimated cost</p>
      ) : null}
      <h2 id={headingId} className={styles.cardHeading}>
        {quote.displayName}
      </h2>
      <p className={styles.kind}>{KIND_DESCRIPTIONS[quote.kind]}</p>
      {REQUIREMENTS[quote.kind] ? (
        <p className={styles.requirement}>{REQUIREMENTS[quote.kind]}</p>
      ) : null}

      <p className={styles.cost}>
        <span className={styles.costLabel}>Estimated cost</span>
        <span className={styles.costFigure}>{cost.yearly}</span>
        <span className={styles.costMonthly}>{cost.monthly}</span>
      </p>
      {quote.priceVaries ? (
        <p className={styles.note}>
          Based on the last {quote.recentPrices?.days ?? 30} days of prices. What
          you pay will depend on when you use electricity.
        </p>
      ) : null}

      <dl className={styles.details}>
        <div>
          <dt>Unit rate</dt>
          <dd>
            {formatUnitRate(quote.unitRatePence)}
            {quote.priceVaries ? " on average" : ""}
          </dd>
        </div>
        <div>
          <dt>Standing charge</dt>
          <dd>{formatStandingCharge(quote.standingChargePencePerDay)}</dd>
        </div>
        <div>
          <dt>Contract</dt>
          <dd>{describeTerm(quote.termMonths, quote.priceVaries)}</dd>
        </div>
        <div>
          <dt>Exit fee</dt>
          <dd>{describeExitFee(quote.exitFeePence)}</dd>
        </div>
      </dl>

      <Button className={styles.choose} onClick={() => onChoose(quote.id)}>
        Choose <span className="visually-hidden">{quote.displayName}</span>
      </Button>
    </li>
  );
}
