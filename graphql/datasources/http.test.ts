import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchJson } from "./http";
import { UpstreamError } from "./types";

const URL_WITH_POSTCODE = "https://api.postcodes.io/postcodes/SW1A1AA/validate";
const options = { service: "postcodes.io" as const, endpoint: "validate", retryDelayMs: 0 };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function mockFetch(...responses: (Response | Error)[]) {
  const fetchMock = vi.fn(async () => {
    const next = responses.shift();
    if (!next) throw new Error("No more responses");
    if (next instanceof Error) throw next;
    return next;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("fetchJson", () => {
  it("returns the parsed body", async () => {
    mockFetch(json({ result: true }));
    await expect(fetchJson(URL_WITH_POSTCODE, options)).resolves.toEqual({ result: true });
  });

  it("retries once after a temporary failure", async () => {
    const fetchMock = mockFetch(json({}, 503), json({ result: true }));
    await expect(fetchJson(URL_WITH_POSTCODE, options)).resolves.toEqual({ result: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries once after a network error or rate limit", async () => {
    mockFetch(new TypeError("fetch failed"), json({ ok: 1 }));
    await expect(fetchJson(URL_WITH_POSTCODE, options)).resolves.toEqual({ ok: 1 });

    mockFetch(json({}, 429), json({ ok: 2 }));
    await expect(fetchJson(URL_WITH_POSTCODE, options)).resolves.toEqual({ ok: 2 });
  });

  it("gives up after the second failure", async () => {
    const fetchMock = mockFetch(json({}, 502), json({}, 502));
    await expect(fetchJson(URL_WITH_POSTCODE, options)).rejects.toThrow(UpstreamError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a 404", async () => {
    const fetchMock = mockFetch(json({}, 404));
    await expect(fetchJson(URL_WITH_POSTCODE, options)).rejects.toThrow("returned 404");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("times out a slow upstream", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
          }),
      ),
    );
    await expect(
      fetchJson(URL_WITH_POSTCODE, { ...options, timeoutMs: 20 }),
    ).rejects.toThrow("timed out after 20ms");
  });

  it("never puts the URL, and so the postcode, in error messages", async () => {
    mockFetch(json({}, 500), json({}, 500));
    const error = await fetchJson(URL_WITH_POSTCODE, options).catch((caught: unknown) => caught);
    expect(String((error as Error).message)).not.toContain("SW1A");
    expect(String((error as Error).message)).toBe("postcodes.io validate returned 500");
  });
});

describe("upstream call logging", () => {
  it("logs one line per real request, with no URL, only when switched on", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    mockFetch(json({}));
    await fetchJson(URL_WITH_POSTCODE, options);
    expect(log).not.toHaveBeenCalled();

    vi.stubEnv("LOG_UPSTREAM_CALLS", "1");
    mockFetch(json({}, 503), json({}));
    await fetchJson(URL_WITH_POSTCODE, options);
    expect(log.mock.calls.map((call) => call[0])).toEqual([
      '{"type":"upstream","service":"postcodes.io","endpoint":"validate"}',
      '{"type":"upstream","service":"postcodes.io","endpoint":"validate"}',
    ]);
  });
});
