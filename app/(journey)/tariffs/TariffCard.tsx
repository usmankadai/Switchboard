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
import { CHEAPEST_LABEL, KIND_DESCRIPTIONS, REQUIREMENTS } from "./tariffCopy";
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
        <p className={styles.badge}>{CHEAPEST_LABEL}</p>
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
