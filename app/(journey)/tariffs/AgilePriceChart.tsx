"use client";

import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { formatUnitRate } from "@/lib/money";
import {
  extremeWindow,
  slotRange,
  slotStartTime,
  type PriceWindow,
  type TimeOfDayPrice,
} from "@/lib/time-of-day";
import styles from "./tariffs.module.css";

/** Three hours, the window people can usually shift a dishwasher or EV charge into. */
const WINDOW_SLOTS = 6;

const HEIGHT = 270;
const MARGIN = { top: 44, right: 8, bottom: 28, left: 40 };
/** Room one window label needs (about 100px for "Cheapest 3 hours" at 12px). */
const LABEL_SPACE = 110;
const BAR_GAP = 2;
const MAX_BAR = 24;
const END_RADIUS = 4;

/** A tidy tick step (1, 2, 5 × 10ⁿ) giving about four ticks. */
function niceStep(range: number): number {
  const rough = range / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const multiple = [1, 2, 5, 10].find((m) => m * power >= rough) ?? 10;
  return multiple * power;
}

/** A column with a rounded data end and a square base on the zero line. */
function columnPath(x: number, width: number, zeroY: number, valueY: number): string {
  const height = Math.abs(zeroY - valueY);
  const r = Math.min(END_RADIUS, width / 2, height);
  if (valueY <= zeroY) {
    // Positive: rounded top.
    return `M${x},${zeroY} V${valueY + r} Q${x},${valueY} ${x + r},${valueY} H${x + width - r} Q${x + width},${valueY} ${x + width},${valueY + r} V${zeroY} Z`;
  }
  // Negative: rounded bottom.
  return `M${x},${zeroY} V${valueY - r} Q${x},${valueY} ${x + r},${valueY} H${x + width - r} Q${x + width},${valueY} ${x + width},${valueY - r} V${zeroY} Z`;
}

/** Plain-English summary, shown above the chart and used as its accessible description. */
export function describeTimeOfDay(
  cheapest: PriceWindow | null,
  dearest: PriceWindow | null,
  days: number,
): string {
  if (!cheapest || !dearest) return `Average prices by time of day over the last ${days} days.`;
  return `Over the last ${days} days, prices were lowest on average from ${slotRange(cheapest.startSlot, cheapest.length)} (about ${formatUnitRate(cheapest.averagePence)}) and highest from ${slotRange(dearest.startSlot, dearest.length)} (about ${formatUnitRate(dearest.averagePence)}).`;
}

/** Track the rendered width so text stays at its real size on every screen. */
function useWidth(initial: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const element = ref.current;
    // Without ResizeObserver (very old browsers, test environments) the chart
    // keeps its default width and scales down with CSS instead.
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(280, Math.round(entry.contentRect.width)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

type AgilePriceChartProps = {
  byTimeOfDay: readonly TimeOfDayPrice[];
  days: number;
};

export function AgilePriceChart({ byTimeOfDay, days }: AgilePriceChartProps) {
  const { ref, width } = useWidth(640);
  const [hovered, setHovered] = useState<number | null>(null);
  const titleId = useId();
  const summaryId = useId();

  const cheapest = extremeWindow(byTimeOfDay, WINDOW_SLOTS, "cheapest");
  const dearest = extremeWindow(byTimeOfDay, WINDOW_SLOTS, "dearest");
  const summary = describeTimeOfDay(cheapest, dearest, days);

  const values = byTimeOfDay.map((entry) => entry.averagePence);
  const step = niceStep(Math.max(...values, 0) - Math.min(...values, 0) || 10);
  const yMin = Math.min(0, Math.floor(Math.min(...values) / step) * step);
  const yMax = Math.max(step, Math.ceil(Math.max(...values) / step) * step);
  const ticks = Array.from(
    { length: Math.round((yMax - yMin) / step) + 1 },
    (_, index) => yMin + index * step,
  );

  const plotWidth = width - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const slotWidth = plotWidth / 48;
  const barWidth = Math.min(MAX_BAR, Math.max(1, slotWidth - BAR_GAP));
  const x = (slot: number) => MARGIN.left + slot * slotWidth;
  const y = (pence: number) => MARGIN.top + ((yMax - pence) / (yMax - yMin)) * plotHeight;
  const zeroY = y(0);
  // Label every 3 hours where there is room, every 6 on narrow screens.
  const labelEvery = slotWidth >= 10 ? 6 : 12;

  function onPointerMove(event: PointerEvent<SVGRectElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const slot = Math.floor(((event.clientX - box.left) / box.width) * 48);
    setHovered(slot >= 0 && slot < 48 ? slot : null);
  }

  const hoveredEntry = byTimeOfDay.find((entry) => entry.slot === hovered);

  /** Where a window's label sits: centred on the window, kept inside the chart. */
  function labelX(window: PriceWindow) {
    const centre = x(window.startSlot) + (window.length * slotWidth) / 2;
    return Math.min(Math.max(centre, MARGIN.left + 50), width - MARGIN.right - 50);
  }

  // If the two labels would overlap (neighbouring windows, or a narrow
  // screen), lift the second onto a row of its own rather than let them collide.
  const labelsCollide =
    cheapest !== null && dearest !== null && Math.abs(labelX(cheapest) - labelX(dearest)) < LABEL_SPACE;

  /** A labelled background band for a price window (split if it wraps past midnight). */
  function band(window: PriceWindow, label: string, row: 0 | 1) {
    const first = Math.min(window.length, 48 - window.startSlot);
    const parts = [{ start: window.startSlot, length: first }];
    if (first < window.length) parts.push({ start: 0, length: window.length - first });
    return (
      <g key={label}>
        {parts.map((part) => (
          <rect
            key={part.start}
            x={x(part.start)}
            y={MARGIN.top}
            width={part.length * slotWidth}
            height={plotHeight}
            className={styles.chartBand}
          />
        ))}
        <text
          x={labelX(window)}
          y={MARGIN.top - 10 - row * 16}
          textAnchor="middle"
          className={styles.chartAnnotation}
        >
          {label}
        </text>
      </g>
    );
  }

  return (
    <figure className={styles.chartFigure}>
      <h3 id={titleId}>Average price by time of day</h3>
      <p id={summaryId}>{summary}</p>

      <div ref={ref} className={styles.chartFrame}>
        <svg
          role="img"
          aria-labelledby={`${titleId} ${summaryId}`}
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
        >
          {cheapest ? band(cheapest, "Cheapest 3 hours", 0) : null}
          {dearest ? band(dearest, "Dearest 3 hours", labelsCollide ? 1 : 0) : null}

          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={y(tick)}
                y2={y(tick)}
                className={tick === 0 ? styles.chartZero : styles.chartGrid}
              />
              <text x={MARGIN.left - 6} y={y(tick)} dy="0.32em" textAnchor="end" className={styles.chartAxis}>
                {`${tick}p`}
              </text>
            </g>
          ))}

          {byTimeOfDay.map((entry) => (
            <path
              key={entry.slot}
              d={columnPath(
                x(entry.slot) + (slotWidth - barWidth) / 2,
                barWidth,
                zeroY,
                y(entry.averagePence),
              )}
              className={entry.slot === hovered ? styles.chartBarHover : styles.chartBar}
            />
          ))}

          {Array.from({ length: 48 / labelEvery }, (_, index) => index * labelEvery).map((slot) => (
            <text
              key={slot}
              x={x(slot)}
              y={HEIGHT - MARGIN.bottom + 18}
              textAnchor={slot === 0 ? "start" : "middle"}
              className={styles.chartAxis}
            >
              {slotStartTime(slot)}
            </text>
          ))}

          {/* Hover layer: the whole plot is the target, snapping to the nearest half hour. */}
          <rect
            x={MARGIN.left}
            y={MARGIN.top}
            width={plotWidth}
            height={plotHeight}
            fill="transparent"
            onPointerMove={onPointerMove}
            onPointerLeave={() => setHovered(null)}
          />
        </svg>

        {hoveredEntry ? (
          <div
            className={styles.chartTooltip}
            style={{
              left: Math.min(Math.max(x(hoveredEntry.slot) + slotWidth / 2, 70), width - 70),
            }}
            aria-hidden="true"
          >
            <strong>{formatUnitRate(hoveredEntry.averagePence)}</strong>
            <span>{slotRange(hoveredEntry.slot)}</span>
          </div>
        ) : null}
      </div>

      <details className={styles.chartTable}>
        <summary>Show prices by time of day as a table</summary>
        <table>
          <caption>Average Agile price by time of day (UK time), last {days} days</caption>
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Average price</th>
            </tr>
          </thead>
          <tbody>
            {byTimeOfDay.map((entry) => (
              <tr key={entry.slot}>
                <th scope="row">{slotRange(entry.slot)}</th>
                <td>{formatUnitRate(entry.averagePence)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
