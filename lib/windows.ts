/** A window of whole days, as ISO strings, so cache keys stay stable. */
export type DayWindow = { from: string; to: string };

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(at: Date): number {
  return Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate());
}

/**
 * Today, as a whole UTC day. Used to fetch the rates in force now while
 * keeping the cache key the same for every request that day.
 */
export function todayWindow(now: Date): DayWindow {
  const start = startOfUtcDay(now);
  return {
    from: new Date(start).toISOString(),
    to: new Date(start + DAY_MS).toISOString(),
  };
}

/** The last `days` complete UTC days, ending at midnight today. */
export function recentDaysWindow(now: Date, days: number): DayWindow {
  const end = startOfUtcDay(now);
  return {
    from: new Date(end - days * DAY_MS).toISOString(),
    to: new Date(end).toISOString(),
  };
}
