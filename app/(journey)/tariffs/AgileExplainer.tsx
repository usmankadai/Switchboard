"use client";

import { useId } from "react";
import { graphql, useFragment, type FragmentType } from "@/generated";
import { formatUnitRate } from "@/lib/money";
import { AgilePriceChart } from "./AgilePriceChart";
import styles from "./tariffs.module.css";

export const AgileExplainerFragment = graphql(`
  fragment AgileExplainer_quote on TariffQuote {
    displayName
    recentPrices {
      averagePence
      minPence
      maxPence
      days
      byTimeOfDay {
        slot
        averagePence
      }
    }
  }
`);

/**
 * "Is Agile right for you?" in plain English, using the real price range,
 * with a time-of-day chart (plus a text summary and a table alternative).
 */
export function AgileExplainer({
  quote: quoteRef,
}: {
  quote: FragmentType<typeof AgileExplainerFragment>;
}) {
  const quote = useFragment(AgileExplainerFragment, quoteRef);
  const headingId = useId();
  const prices = quote.recentPrices;
  if (!prices) return null;

  return (
    <section className={styles.explainer} aria-labelledby={headingId}>
      <h2 id={headingId}>Is {quote.displayName} right for you?</h2>
      <p>
        Over the last {prices.days} days, prices went from{" "}
        <strong>{formatUnitRate(prices.minPence)}</strong> to{" "}
        <strong>{formatUnitRate(prices.maxPence)}</strong>. For a typical home&apos;s
        pattern of use, that averaged {formatUnitRate(prices.averagePence)}.
      </p>
      {prices.minPence < 0 ? (
        <p>
          At times the price went below zero. That means people on this tariff were
          paid to use electricity.
        </p>
      ) : null}

      <AgilePriceChart byTimeOfDay={prices.byTimeOfDay} days={prices.days} />

      <h3>It could suit you if you can</h3>
      <ul>
        <li>run the washing machine or dishwasher overnight or in the middle of the day</li>
        <li>charge an electric car or home battery when prices are low</li>
        <li>check the next day&apos;s prices, which come out each afternoon</li>
      </ul>

      <h3>It may not suit you if</h3>
      <ul>
        <li>
          most of your use is between 4pm and 7pm, when prices are usually at their
          highest
        </li>
        <li>you would rather not think about when you use electricity</li>
      </ul>
    </section>
  );
}
