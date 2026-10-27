import { UpstreamError } from "./types";

/**
 * Resilient JSON fetch for upstream APIs.
 *
 * - Times out, so a slow upstream cannot hold a request open.
 * - Retries once, briefly, on errors that are usually temporary (network
 *   failures, timeouts, 429 and 5xx). Never retries other 4xx responses.
 * - Error messages name the endpoint, never the URL: some URLs contain the
 *   customer's postcode, and error messages end up in logs and monitoring.
 */

export const TIMEOUT_MS = 6000;
export const RETRY_DELAY_MS = 300;

type Service = UpstreamError["service"];

export type FetchJsonOptions = {
  service: Service;
  /** A short name for the endpoint, for errors and logs, for example "products". */
  endpoint: string;
  timeoutMs?: number;
  retryDelayMs?: number;
};

const isRetryableStatus = (status: number) => status === 429 || status >= 500;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function attempt(url: string, { service, endpoint, timeoutMs = TIMEOUT_MS }: FetchJsonOptions) {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (cause) {
    // Check the name rather than `instanceof DOMException`: the error can come
    // from another realm (a different runtime or test environment).
    const timedOut =
      typeof cause === "object" && cause !== null && "name" in cause && cause.name === "TimeoutError";
    return {
      ok: false as const,
      retryable: true,
      error: new UpstreamError(
        timedOut
          ? `${service} ${endpoint} timed out after ${timeoutMs}ms`
          : `Could not reach ${service} ${endpoint}`,
        service,
      ),
    };
  }

  if (!response.ok) {
    return {
      ok: false as const,
      retryable: isRetryableStatus(response.status),
      error: new UpstreamError(`${service} ${endpoint} returned ${response.status}`, service),
    };
  }

  try {
    return { ok: true as const, body: (await response.json()) as unknown };
  } catch {
    return {
      ok: false as const,
      retryable: false,
      error: new UpstreamError(`${service} ${endpoint} returned invalid JSON`, service),
    };
  }
}

/**
 * Opt-in log of every real upstream request, used by the load test to show
 * how few calls reach the upstream APIs. Endpoint names only, never URLs.
 */
function logUpstreamCall({ service, endpoint }: FetchJsonOptions) {
  if (process.env.LOG_UPSTREAM_CALLS === "1") {
    console.log(JSON.stringify({ type: "upstream", service, endpoint }));
  }
}

export async function fetchJson(url: string, options: FetchJsonOptions): Promise<unknown> {
  logUpstreamCall(options);
  const first = await attempt(url, options);
  if (first.ok) return first.body;
  if (!first.retryable) throw first.error;

  await wait(options.retryDelayMs ?? RETRY_DELAY_MS);
  logUpstreamCall(options);
  const second = await attempt(url, options);
  if (second.ok) return second.body;
  throw second.error;
}
