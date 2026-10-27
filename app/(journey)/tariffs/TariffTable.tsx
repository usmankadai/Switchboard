"use client";

import { useId } from "react";
import { Button } from "@/components/Button";
import { graphql, useFragment, type FragmentType } from "@/generated";
import { describeCost, describeExitFee, describeTerm } from "@/lib/comparison";
import { formatStandingCharge, formatUnitRate } from "@/lib/money";
import { CHEAPEST_LABEL, KIND_DESCRIPTIONS, REQUIREMENTS } from "./tariffCopy";
import styles from "./tariffs.module.css";

export const TariffTableFragment = graphql(`
  fragment TariffTable_quote on TariffQuote {
    id
    kind
    displayName
    termMonths
    exitFeePence
    unitRatePence
    standingChargePencePerDay
    estimatedAnnualCostPence
    priceVaries
  }
`);

type TariffTableProps = {
  quotes: readonly FragmentType<typeof TariffTableFragment>[];
  cheapestId: string | null;
  onChoose: (id: string) => void;
};

/**
 * The "table" variant of the tariff layout A/B test (ADR 3): the same
 * tariffs, facts and wording as the cards, side by side so they are easier
 * to compare. On narrow screens the table scrolls sideways inside a labelled
 * region that keyboard users can reach, with the tariff column held in place
 * so every row stays identifiable.
 */
export function TariffTable({ quotes: quoteRefs, cheapestId, onChoose }: TariffTableProps) {
  const quotes = useFragment(TariffTableFragment, quoteRefs);
  const captionId = useId();

  return (
    <>
      {/* Only shown on screens too narrow for the whole table (see the CSS). */}
      <p className={styles.scrollHint}>
        Scroll the table sideways to see every detail and the Choose buttons.
      </p>
      <div
        role="region"
        aria-labelledby={captionId}
        // Focusable so keyboard users can scroll it on narrow screens.
        tabIndex={0}
        className={styles.tableScroll}
      >
        <table className={styles.compareTable}>
          <caption id={captionId} className={styles.compareCaption}>
            Tariffs compared
          </caption>
          <thead>
            <tr>
              <th scope="col">Tariff</th>
              <th scope="col">Estimated cost</th>
              <th scope="col">Unit rate</th>
              <th scope="col">Standing charge</th>
              <th scope="col">Contract</th>
              <th scope="col">Exit fee</th>
              <th scope="col">
                <span className="visually-hidden">Choose a tariff</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => {
              const cost = describeCost(quote.estimatedAnnualCostPence);
              const requirement = REQUIREMENTS[quote.kind];
              return (
                <tr key={quote.id}>
                  <th scope="row" className={styles.compareTariff}>
                    {quote.id === cheapestId ? (
                      <span className={styles.badge}>{CHEAPEST_LABEL}</span>
                    ) : null}
                    <span className={styles.compareName}>{quote.displayName}</span>
                    <span className={styles.compareDetail}>{KIND_DESCRIPTIONS[quote.kind]}</span>
                    {requirement ? <span className={styles.requirement}>{requirement}</span> : null}
                  </th>
                  <td>
                    <span className={styles.compareCost}>{cost.yearly}</span>
                    <span className={styles.compareDetail}>{cost.monthly}</span>
                    {quote.priceVaries ? (
                      <span className={styles.compareDetail}>Based on the last 30 days of prices</span>
                    ) : null}
                  </td>
                  <td>
                    {formatUnitRate(quote.unitRatePence)}
                    {quote.priceVaries ? " on average" : ""}
                  </td>
                  <td>{formatStandingCharge(quote.standingChargePencePerDay)}</td>
                  <td>{describeTerm(quote.termMonths, quote.priceVaries)}</td>
                  <td>{describeExitFee(quote.exitFeePence)}</td>
                  <td>
                    <Button onClick={() => onChoose(quote.id)}>
                      Choose <span className="visually-hidden">{quote.displayName}</span>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
