/**
 * Load test: does the caching strategy hold up in a traffic spike?
 *
 * Simulates a price-change-day spike on the tariff comparison (the busiest
 * and most expensive request), plus a steady trickle of postcode lookups.
 *
 * Run it with `pnpm load` (see load-tests/run-local.sh), which also counts how
 * many requests reached the upstream APIs. That count is the real result: it
 * should depend on how many different regions and tariffs exist, not on
 * how much traffic arrives.
 *
 * Be polite. The upstream APIs are free public services we do not own, so
 * the test uses a fixed, small set of inputs and a gentle postcode rate.
 * Pointing this at a deployment mostly measures the CDN, and may count
 * against the host's limits: only do that on purpose.
 */
import { check } from "k6";
import http from "k6/http";
import { Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const PEAK_RATE = Number(__ENV.PEAK_RATE || 200);

/** All 14 regions × 3 typical usages: 42 distinct comparisons. */
const REGIONS = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "P"];
const USAGES = [1800, 2700, 4100];
const COMPARISONS = REGIONS.flatMap((regionCode) =>
  USAGES.map((annualKwh) => ({ regionCode, annualKwh })),
);

/** A few real postcodes in different regions. */
const POSTCODES = ["SW1A 1AA", "M1 1AE", "B33 8TH", "EH1 1YZ", "CF10 1EP"];

const COMPARISON_QUERY = `query TariffComparison($regionCode: ID!, $annualKwh: Int!) {
  tariffComparison(regionCode: $regionCode, annualKwh: $annualKwh) {
    pricesCheckedAt
    unavailableKinds
    quotes { id kind estimatedAnnualCostPence }
  }
}`;

const REGION_QUERY = `query RegionLookup($postcode: String!) {
  region(postcode: $postcode) { code name }
}`;

// Sent exactly as Apollo Client sends them, including the JSON content type
// on GET that once caused a server error.
const HEADERS = {
  "apollo-require-preflight": "true",
  "content-type": "application/json",
};

const coldComparison = new Trend("cold_comparison_duration", true);

export const options = {
  scenarios: {
    comparison_spike: {
      executor: "ramping-arrival-rate",
      exec: "comparison",
      startRate: 5,
      timeUnit: "1s",
      preAllocatedVUs: 50,
      maxVUs: 400,
      stages: [
        { target: 50, duration: "20s" },
        { target: PEAK_RATE, duration: "20s" },
        { target: PEAK_RATE, duration: "60s" },
        { target: 0, duration: "10s" },
      ],
    },
    postcode_lookups: {
      executor: "constant-arrival-rate",
      exec: "postcodeLookup",
      rate: 2,
      timeUnit: "1s",
      duration: "110s",
      preAllocatedVUs: 5,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    checks: ["rate>0.99"],
    // Warm (cached) comparisons, measured on the server without a CDN.
    "http_req_duration{scenario:comparison_spike}": ["p(95)<250", "p(99)<500"],
    "http_req_duration{scenario:postcode_lookups}": ["p(95)<250"],
  },
  summaryTrendStats: ["avg", "med", "p(90)", "p(95)", "p(99)", "max"],
};

function comparisonUrl({ regionCode, annualKwh }) {
  const variables = encodeURIComponent(JSON.stringify({ regionCode, annualKwh }));
  return `${BASE_URL}/api/graphql?operationName=TariffComparison&query=${encodeURIComponent(COMPARISON_QUERY)}&variables=${variables}`;
}

function checkComparison(response) {
  return check(response, {
    "comparison status is 200": (r) => r.status === 200,
    "comparison has quotes and no errors": (r) => {
      const body = r.json();
      return !body.errors && body.data.tariffComparison.quotes.length > 0;
    },
    "comparison is CDN cacheable": (r) =>
      (r.headers["Cdn-Cache-Control"] || "").includes("s-maxage=300"),
  });
}

/**
 * Before the spike, request each comparison once. These are the cold
 * requests that fill the cache, recorded separately so the spike numbers are
 * not mixed with them.
 */
export function setup() {
  for (const comparison of COMPARISONS) {
    const response = http.get(comparisonUrl(comparison), {
      headers: HEADERS,
      tags: { name: "comparison (cold)" },
    });
    coldComparison.add(response.timings.duration);
    checkComparison(response);
  }
}

export function comparison() {
  const pick = COMPARISONS[Math.floor(Math.random() * COMPARISONS.length)];
  const response = http.get(comparisonUrl(pick), {
    headers: HEADERS,
    tags: { name: "comparison" },
  });
  checkComparison(response);
}

export function postcodeLookup() {
  const postcode = POSTCODES[Math.floor(Math.random() * POSTCODES.length)];
  // POST, as in the app: postcodes never go in URLs.
  const response = http.post(
    `${BASE_URL}/api/graphql`,
    JSON.stringify({ operationName: "RegionLookup", query: REGION_QUERY, variables: { postcode } }),
    { headers: HEADERS, tags: { name: "postcode lookup" } },
  );
  check(response, {
    "lookup status is 200": (r) => r.status === 200,
    "lookup found a region": (r) => Boolean(r.json().data?.region?.code),
  });
}
