import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  analyseTariffLayoutTest,
  describeVerdict,
  SIGNIFICANCE_LEVEL,
  type ExperimentReport,
} from "@/lib/monitoring/abTest";
import { buildFunnelReport, formatShare, type SplitItem } from "@/lib/monitoring/funnelReport";
import { getFunnelStore, lastUkDays } from "@/lib/monitoring/funnelStore";
import styles from "./funnel.module.css";

export const metadata: Metadata = {
  title: "Journey funnel",
  // Internal reporting: keep it out of search results.
  robots: { index: false, follow: false },
};

const RANGES = [
  { days: 1, label: "Today" },
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
] as const;

const DEFAULT_DAYS = 7;

function parseRange(value: string | string[] | undefined): number {
  const days = Number(Array.isArray(value) ? value[0] : value);
  return RANGES.some((range) => range.days === days) ? days : DEFAULT_DAYS;
}

const whole = new Intl.NumberFormat("en-GB");

export default function FunnelPage({ searchParams }: PageProps<"/funnel">) {
  return (
    <div className={`container ${styles.page}`}>
      <h1>Journey funnel</h1>
      <p className={styles.lead}>
        How many people reach each step of the quote journey, and where they leave. Counts are
        distinct, anonymous sessions in UK days.
      </p>
      <Suspense fallback={<p role="status">Loading the funnel…</p>}>
        <FunnelDashboard searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function FunnelDashboard({ searchParams }: { searchParams: PageProps<"/funnel">["searchParams"] }) {
  const { range } = await searchParams;
  // Counts change with every visitor, so always read them at request time.
  await connection();

  const days = parseRange(range);
  const store = getFunnelStore();
  const counts = await store.counts(lastUkDays(new Date(), days));
  const report = buildFunnelReport(counts);
  const experiment = analyseTariffLayoutTest(counts.experiment);
  const rangeLabel = RANGES.find((item) => item.days === days)!.label.toLowerCase();

  return (
    <>
      {/* Filters: one row, above everything they scope. */}
      <nav aria-label="Period" className={styles.ranges}>
        {RANGES.map((item) => (
          <Link
            key={item.days}
            href={item.days === DEFAULT_DAYS ? "/funnel" : `/funnel?range=${item.days}`}
            aria-current={item.days === days ? "page" : undefined}
            className={styles.range}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {report.started === 0 ? (
        <div className={styles.empty}>
          <p>No journeys recorded {days === 1 ? "today" : `in the ${rangeLabel}`} yet.</p>
        </div>
      ) : (
        <>
          <section aria-labelledby="headline-heading" className={styles.tiles}>
            <h2 id="headline-heading" className="visually-hidden">
              Headline numbers
            </h2>
            <div className={`${styles.tile} ${styles.heroTile}`}>
              <p className={styles.tileLabel}>Started to finished</p>
              <p className={styles.hero}>{formatShare(report.conversion)}</p>
            </div>
            <div className={styles.tile}>
              <p className={styles.tileLabel}>Started</p>
              <p className={styles.tileValue}>{whole.format(report.started)}</p>
            </div>
            <div className={styles.tile}>
              <p className={styles.tileLabel}>Reached confirmation</p>
              <p className={styles.tileValue}>{whole.format(report.finished)}</p>
            </div>
          </section>

          {report.biggestDropOff ? (
            <p className={styles.callout}>
              <strong>Biggest drop-off:</strong> {whole.format(report.biggestDropOff.lost)} people (
              {formatShare(report.biggestDropOff.share)}) left between {report.biggestDropOff.from}{" "}
              and {report.biggestDropOff.to}.
            </p>
          ) : null}

          <section aria-labelledby="steps-heading">
            <h2 id="steps-heading">Sessions at each step</h2>
            <ol className={styles.funnel}>
              {report.steps.map((step) => (
                <li key={step.step} className={styles.funnelRow}>
                  {step.fromPrevious !== null ? (
                    <p className={styles.continued}>{formatShare(step.fromPrevious)} continued</p>
                  ) : null}
                  <div className={styles.rowText}>
                    <span className={styles.rowLabel}>{step.label}</span>
                    <span className={styles.rowValue}>
                      {whole.format(step.sessions)}
                      <span className={styles.rowShare}> · {formatShare(step.shareOfStart)} of start</span>
                    </span>
                  </div>
                  <Bar share={step.shareOfStart} />
                </li>
              ))}
            </ol>
          </section>

          <div className={styles.splits}>
            <Split heading="How people gave their usage" items={report.usageMethods} />
            <Split heading="Tariffs chosen" items={report.tariffChoices} />
          </div>


          <details className={styles.tableView}>
            <summary>Show the funnel as a table</summary>
            <table>
              <caption>Sessions at each step, {rangeLabel}</caption>
              <thead>
                <tr>
                  <th scope="col">Step</th>
                  <th scope="col">Sessions</th>
                  <th scope="col">Share of start</th>
                  <th scope="col">From previous step</th>
                </tr>
              </thead>
              <tbody>
                {report.steps.map((step) => (
                  <tr key={step.step}>
                    <th scope="row">{step.label}</th>
                    <td>{whole.format(step.sessions)}</td>
                    <td>{formatShare(step.shareOfStart)}</td>
                    <td>{formatShare(step.fromPrevious)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}

      {/* Shown even before the funnel has data: the test runs on its own events. */}
      <Experiment report={experiment} />

      <p className={styles.footnote}>
        {store.kind === "redis"
          ? "Stored in Redis for 90 days."
          : "Stored in this server's memory, so counts reset when it restarts. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to keep them."}{" "}
        No personal data is collected: each session is a random id that cannot be read back.
      </p>
    </>
  );
}

/** The tariff layout A/B test (ADR 3). */
function Experiment({ report }: { report: ExperimentReport }) {
  return (
    <section aria-labelledby="experiment-heading" className={styles.experiment}>
      <h2 id="experiment-heading">Experiment: tariff layout</h2>
      <p>
        Half of visitors see the tariffs as cards, half as a comparison table. Which gets more
        people to choose a tariff?
      </p>
      <table className={styles.experimentTable}>
        <caption className="visually-hidden">Choose rate by layout</caption>
        <thead>
          <tr>
            <th scope="col">Layout</th>
            <th scope="col">Saw tariffs</th>
            <th scope="col">Chose a tariff</th>
            <th scope="col">Choose rate</th>
          </tr>
        </thead>
        <tbody>
          {report.variants.map((variant) => (
            <tr key={variant.layout}>
              <th scope="row">{variant.label}</th>
              <td>{whole.format(variant.sessions)}</td>
              <td>{whole.format(variant.conversions)}</td>
              <td>
                {formatShare(variant.rate)}
                <Bar share={variant.rate} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.callout}>
        <strong>Result:</strong> {describeVerdict(report)}
      </p>
      <p className={styles.footnote}>
        Plan for about {whole.format(report.plannedSessionsPerVariant)} sessions per layout to
        reliably spot a 5 point change ({Math.round((1 - SIGNIFICANCE_LEVEL) * 100)}% confidence, 80%
        power). Decide when to stop before looking: stopping as soon as a result looks significant
        makes false winners much more likely.
      </p>
    </section>
  );
}

/**
 * A horizontal bar. Decorative: the number is always written beside it.
 * Zero draws nothing, so "none" never looks like "a little".
 */
function Bar({ share }: { share: number | null }) {
  const width = Math.max(0, (share ?? 0) * 100);
  return (
    <div className={styles.track} aria-hidden="true">
      {width > 0 ? <div className={styles.bar} style={{ width: `${width}%` }} /> : null}
    </div>
  );
}

function Split({ heading, items }: { heading: string; items: SplitItem[] }) {
  const total = items.reduce((sum, item) => sum + item.sessions, 0);
  return (
    <section className={styles.split} aria-label={heading}>
      <h2>{heading}</h2>
      {total === 0 ? (
        <p className={styles.footnote}>None yet.</p>
      ) : (
        <ul className={styles.splitList}>
          {items.map((item) => (
            <li key={item.label}>
              <div className={styles.rowText}>
                <span>{item.label}</span>
                <span className={styles.rowValue}>
                  {whole.format(item.sessions)}
                  <span className={styles.rowShare}> · {formatShare(item.share)}</span>
                </span>
              </div>
              <Bar share={item.share} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
