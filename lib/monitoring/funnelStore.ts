import "server-only";
import {
  FUNNEL_ACTIONS,
  FUNNEL_DETAILS,
  FUNNEL_STEPS,
  type FunnelAction,
  type FunnelDetail,
  type FunnelEvent,
  type FunnelStep,
} from "./funnel";

/**
 * Where funnel events are counted.
 *
 * Every count is of distinct sessions, never raw events, so refreshing a
 * page does not inflate a step. With Redis, sessions go into HyperLogLogs:
 * they can answer "how many different sessions?" but cannot give the ids
 * back, so even the random session ids are not recoverable. Data expires
 * after 90 days.
 */

export type FunnelCounts = {
  steps: Record<FunnelStep, Record<FunnelAction, number>>;
  details: Record<FunnelDetail, number>;
};

export interface FunnelStore {
  /** Which store is in use, for the dashboard footer. */
  readonly kind: "memory" | "redis";
  record(event: FunnelEvent, day: string): Promise<void>;
  /** Distinct sessions across the given UK days ("2026-10-27"). */
  counts(days: readonly string[]): Promise<FunnelCounts>;
}

export const RETENTION_SECONDS = 90 * 24 * 60 * 60;

const stepKey = (day: string, step: FunnelStep, action: FunnelAction) =>
  `funnel:${day}:${step}:${action}`;
const detailKey = (day: string, detail: FunnelDetail) => `funnel:${day}:detail:${detail}`;

function keysFor(event: FunnelEvent, day: string): string[] {
  const keys = [stepKey(day, event.step, event.action)];
  if (event.detail) keys.push(detailKey(day, event.detail));
  return keys;
}

/** Build counts by asking one question per metric. */
async function countAll(
  days: readonly string[],
  distinct: (keys: string[]) => Promise<number>,
): Promise<FunnelCounts> {
  const steps = {} as FunnelCounts["steps"];
  for (const step of FUNNEL_STEPS) {
    steps[step] = {} as Record<FunnelAction, number>;
    for (const action of FUNNEL_ACTIONS) {
      steps[step][action] = await distinct(days.map((day) => stepKey(day, step, action)));
    }
  }
  const details = {} as FunnelCounts["details"];
  for (const detail of FUNNEL_DETAILS) {
    details[detail] = await distinct(days.map((day) => detailKey(day, detail)));
  }
  return { steps, details };
}

/**
 * In-memory store: the default, with nothing to set up. Fine locally and on
 * one long-running server. On serverless hosting each instance has its own
 * memory, so set up Redis there.
 */
export function createMemoryStore(): FunnelStore {
  const sets = new Map<string, Set<string>>();
  return {
    kind: "memory",
    async record(event, day) {
      for (const key of keysFor(event, day)) {
        const set = sets.get(key) ?? new Set<string>();
        set.add(event.sessionId);
        sets.set(key, set);
      }
    },
    counts(days) {
      return countAll(days, async (keys) => {
        const union = new Set<string>();
        for (const key of keys) for (const id of sets.get(key) ?? []) union.add(id);
        return union.size;
      });
    },
  };
}

type RedisCommand = (string | number)[];

/**
 * Redis over HTTP (Upstash's REST API), so no client library is needed and
 * it works on serverless and edge runtimes.
 */
export function createRedisStore(
  url: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): FunnelStore {
  async function pipeline(commands: RedisCommand[]): Promise<unknown[]> {
    const response = await fetchImpl(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error(`Redis returned ${response.status}`);
    const results = (await response.json()) as { result?: unknown; error?: string }[];
    const failed = results.find((result) => result.error);
    if (failed) throw new Error(`Redis error: ${failed.error}`);
    return results.map((result) => result.result);
  }

  return {
    kind: "redis",
    async record(event, day) {
      await pipeline(
        keysFor(event, day).flatMap((key) => [
          ["PFADD", key, event.sessionId],
          ["EXPIRE", key, RETENTION_SECONDS],
        ]),
      );
    },
    async counts(days) {
      // One round trip: list every PFCOUNT, then read the answers in order.
      const questions: string[][] = [];
      const collect = await countAll(days, async (keys) => {
        questions.push(keys);
        return questions.length - 1;
      });
      const answers = await pipeline(questions.map((keys) => ["PFCOUNT", ...keys]));
      const read = (index: number) => Number(answers[index] ?? 0);

      const steps = {} as FunnelCounts["steps"];
      for (const step of FUNNEL_STEPS) {
        steps[step] = {} as Record<FunnelAction, number>;
        for (const action of FUNNEL_ACTIONS) steps[step][action] = read(collect.steps[step][action]);
      }
      const details = {} as FunnelCounts["details"];
      for (const detail of FUNNEL_DETAILS) details[detail] = read(collect.details[detail]);
      return { steps, details };
    },
  };
}

// Keep one memory store per server process, even across hot reloads in dev.
const globalStore = globalThis as typeof globalThis & { __switchboardFunnel?: FunnelStore };

/** Redis when configured, otherwise in memory. */
export function getFunnelStore(): FunnelStore {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return createRedisStore(url, token);
  globalStore.__switchboardFunnel ??= createMemoryStore();
  return globalStore.__switchboardFunnel;
}

const ukDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" });

/** The UK calendar day for an instant, as "2026-10-27". */
export function ukDay(at: Date): string {
  return ukDate.format(at);
}

/** The last `count` UK days, ending today. */
export function lastUkDays(now: Date, count: number): string[] {
  return Array.from({ length: count }, (_, index) =>
    ukDay(new Date(now.getTime() - index * 24 * 60 * 60 * 1000)),
  );
}
