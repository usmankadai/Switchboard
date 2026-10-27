# 2. Caching, resilience and performance budgets

Date: 27 October 2026. Status: accepted.

## Context

An onboarding journey gets sudden traffic spikes, for example on the day a price cap change is announced. The tariff comparison depends on a public API we do not control. We need the journey to stay fast and available, without hammering that API, and without leaking personal data into caches, URLs or logs.

## Decisions

### 1. Shared server cache: `'use cache: remote'`

The datasource functions first used plain `'use cache'`. The Next.js 16 docs note that on serverless hosting this in-memory cache "typically doesn't persist across requests", because each request can land on a different instance. In a spike, most requests would still reach the Octopus API.

All datasource functions now use `'use cache: remote'`, which the platform backs with a shared store (locally it falls back to in-memory). Lifetimes come from `cacheLife` presets. Past `revalidate` but within `expire`, the stale entry is served while a fresh one is fetched in the background, so a short upstream outage is invisible to customers.

### 2. Cache priced results, not just raw data

The load test showed that caching the raw upstream data was not enough. Each warm comparison still read 30 days of half-hourly Agile prices from the cache and averaged them, about 45ms of CPU, which capped one server at about 20 comparisons a second. A pricing layer now caches the priced result for each tariff, region and hour; requests only do the cost arithmetic for the customer's usage. A warm comparison dropped to under 3ms.

### 3. Edge cache for the comparison query

`tariffComparison` is sent as a GET request, and the schema marks it cacheable for 5 minutes with `@cacheControl`. Apollo Server turns that into `Cache-Control`, and the route handler adds `CDN-Cache-Control: public, s-maxage=300, stale-while-revalidate=3600`. Repeat requests for the same region and usage are answered by the CDN.

Rules that keep this safe:

- **Only queries with no personal variables may use GET.** URLs end up in CDN and server logs. The postcode lookup stays POST and is never cacheable.
- Errors and partial results are always `no-store`.
- Mutations are always POST (Apollo refuses mutations over GET).
- Apollo's CSRF protection stays on; the client sends `apollo-require-preflight`.

### 4. Resilient upstream calls

Every upstream request has a 6 second timeout and one retry for errors that are usually temporary (network failure, timeout, 429, 5xx). Other 4xx responses are not retried. Error messages name the endpoint, never the URL, because some URLs contain a postcode.

If one tariff's prices fail, the others are still shown and `unavailableKinds` tells the UI which tariff is missing, with a retry.

### 5. Performance budgets

Lighthouse CI asserts the median of 5 runs per journey page: LCP ≤ 2.5s, CLS ≤ 0.1, TBT ≤ 200ms (the lab proxy for INP), compressed JavaScript ≤ 250 KB, and an accessibility score of 100.

Throttling is applied for real (`devtools`), not simulated. The simulated mode put LCP at about 2.5s, but the browser actually painted the content at the same moment as first paint. The simulation assumes the paint also waits for every script already downloading. With real slow 4G and a 4x CPU slowdown, LCP measured about 1.35s. Script weight is budgeted directly instead.

Real-user INP, LCP and CLS come from Vercel Speed Insights.

### 6. Monitoring without personal data

- **Sentry** is on only when `NEXT_PUBLIC_SENTRY_DSN` is set. Sentry 11 collects request bodies, headers, cookies, query strings and GraphQL variables by default; all of these are switched off with `dataCollection`, and a scrubber removes emails, postcodes, user details and query strings from every event as a second layer.
- In the browser, Sentry is loaded with a dynamic import, only when configured, after the page starts. It is about 137 KB compressed, and it was being shipped to every visitor even when switched off. Trade-off: an error in the first moments of a page load can be missed. Server errors are always captured.
- **Funnel events** are built only from allow-listed values (step, viewed or completed, and a fixed set of details) with a random per-tab session id, sent with `sendBeacon` to `/api/events`, checked again there, and logged as one JSON line. "Abandoned" is derived later from viewed but not completed.

## Consequences

- Spikes are absorbed first by the CDN, then by the shared server cache, before reaching the Octopus API. The load test confirmed upstream calls stay fixed (137 in every run) however much traffic arrives.
- Budgets fail the build on regressions in speed, layout stability, script weight or accessibility.
- The funnel needs a log drain or log query to become a dashboard. A store-backed funnel view is a follow-up.
