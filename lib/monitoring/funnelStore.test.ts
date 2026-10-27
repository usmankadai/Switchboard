import { describe, expect, it, vi } from "vitest";
import type { FunnelEvent } from "./funnel";
import {
  createMemoryStore,
  createRedisStore,
  lastUkDays,
  RETENTION_SECONDS,
  ukDay,
} from "./funnelStore";

vi.mock("server-only", () => ({}));

const session = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const event = (n: number, overrides: Partial<FunnelEvent> = {}): FunnelEvent => ({
  sessionId: session(n),
  step: "postcode",
  action: "viewed",
  ...overrides,
});

describe("memory store", () => {
  it("counts distinct sessions, so repeat views do not inflate a step", async () => {
    const store = createMemoryStore();
    await store.record(event(1), "2026-10-27");
    await store.record(event(1), "2026-10-27");
    await store.record(event(2), "2026-10-27");
    const counts = await store.counts(["2026-10-27"]);
    expect(counts.steps.postcode.viewed).toBe(2);
    expect(counts.steps.usage.viewed).toBe(0);
  });

  it("counts a session once across several days", async () => {
    const store = createMemoryStore();
    await store.record(event(1), "2026-10-26");
    await store.record(event(1), "2026-10-27");
    expect((await store.counts(["2026-10-26", "2026-10-27"])).steps.postcode.viewed).toBe(1);
    expect((await store.counts(["2026-10-25"])).steps.postcode.viewed).toBe(0);
  });

  it("counts tariffs step sessions per A/B test layout", async () => {
    const store = createMemoryStore();
    await store.record(event(1, { step: "tariffs", action: "viewed", variant: "table" }), "2026-10-27");
    await store.record(event(1, { step: "tariffs", action: "completed", variant: "table" }), "2026-10-27");
    await store.record(event(2, { step: "tariffs", action: "viewed", variant: "cards" }), "2026-10-27");
    // A variant on any other step is ignored.
    await store.record(event(3, { step: "usage", action: "viewed", variant: "cards" }), "2026-10-27");
    expect((await store.counts(["2026-10-27"])).experiment).toEqual({
      cards: { viewed: 1, completed: 0 },
      table: { viewed: 1, completed: 1 },
    });
  });

  it("counts details such as the chosen tariff", async () => {
    const store = createMemoryStore();
    await store.record(event(1, { step: "tariffs", action: "completed", detail: "tariff-agile" }), "2026-10-27");
    const counts = await store.counts(["2026-10-27"]);
    expect(counts.details["tariff-agile"]).toBe(1);
    expect(counts.steps.tariffs.completed).toBe(1);
  });
});

describe("Redis store", () => {
  function fakeRedis(answers: unknown[] = []) {
    const fetchMock = vi.fn<typeof fetch>(
      async () => new Response(JSON.stringify(answers.map((result) => ({ result })))),
    );
    return fetchMock;
  }

  it("adds the session to a HyperLogLog with a 90 day expiry", async () => {
    const fetchMock = fakeRedis([1, 1, 1, 1]);
    const store = createRedisStore("https://redis.example/", "secret", fetchMock);
    await store.record(event(1, { step: "usage", action: "completed", detail: "usage-known" }), "2026-10-27");

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://redis.example/pipeline");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer secret");
    expect(JSON.parse(String(init?.body))).toEqual([
      ["PFADD", "funnel:2026-10-27:usage:completed", session(1)],
      ["EXPIRE", "funnel:2026-10-27:usage:completed", RETENTION_SECONDS],
      ["PFADD", "funnel:2026-10-27:detail:usage-known", session(1)],
      ["EXPIRE", "funnel:2026-10-27:detail:usage-known", RETENTION_SECONDS],
    ]);
  });

  it("reads every count in one round trip, merging days", async () => {
    // 5 steps × 2 actions, then 6 details, then 2 layouts × 2 actions.
    const fetchMock = fakeRedis(Array.from({ length: 20 }, (_, index) => index));
    const store = createRedisStore("https://redis.example", "secret", fetchMock);
    const counts = await store.counts(["2026-10-26", "2026-10-27"]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const commands = JSON.parse(String(fetchMock.mock.calls[0]![1]?.body)) as string[][];
    expect(commands[0]).toEqual([
      "PFCOUNT",
      "funnel:2026-10-26:postcode:viewed",
      "funnel:2026-10-27:postcode:viewed",
    ]);
    expect(counts.steps.postcode).toEqual({ viewed: 0, completed: 1 });
    expect(counts.steps.confirmation).toEqual({ viewed: 8, completed: 9 });
    expect(counts.details["tariff-agile"]).toBe(15);
    expect(counts.experiment).toEqual({
      cards: { viewed: 16, completed: 17 },
      table: { viewed: 18, completed: 19 },
    });
    expect(commands.at(-1)).toEqual([
      "PFCOUNT",
      "funnel:2026-10-26:exp:tariff-layout:table:completed",
      "funnel:2026-10-27:exp:tariff-layout:table:completed",
    ]);
  });

  it("reports Redis errors", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () => new Response(JSON.stringify([{ error: "WRONGTYPE" }])),
    );
    const store = createRedisStore("https://redis.example", "secret", fetchMock);
    await expect(store.record(event(1), "2026-10-27")).rejects.toThrow("WRONGTYPE");
  });
});

describe("UK days", () => {
  it("uses the UK date, not UTC", () => {
    // 23:30 UTC on 27 June is 00:30 on 28 June in BST.
    expect(ukDay(new Date("2026-06-27T23:30:00Z"))).toBe("2026-06-28");
  });

  it("lists recent days, newest first", () => {
    expect(lastUkDays(new Date("2026-10-27T12:00:00Z"), 3)).toEqual([
      "2026-10-27",
      "2026-10-26",
      "2026-10-25",
    ]);
  });
});
