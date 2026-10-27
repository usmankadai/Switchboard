# Switchboard

An accessible, two-minute electricity switching journey: postcode, usage, a comparison of real tariffs, and a short signup.

> **Independent concept.** Tariff data from the public Octopus Energy API. Not affiliated with Octopus Energy. The signup is a demo and never collects payment details.

## Why it exists

A portfolio project showing how I would build an onboarding journey: accessible to WCAG 2.2 AA, fast under high traffic, well tested, and owned from [technical proposal](docs/technical-proposal.md) through to monitoring.

## Stack

Next.js 16 (App Router, Cache Components) on Vercel, React 19, TypeScript (strict), Apollo Server and Apollo Client, GraphQL Code Generator, Vitest with React Testing Library, Playwright with axe.

## How it works

```
Browser ──► Next.js pages (Server Components first)
              │
              ▼
          /api/graphql  (Apollo Server, backend for frontend)
              │   region(postcode), tariffComparison(regionCode, annualKwh)
              ▼
          datasources  ('use cache' + cacheLife)
              │
              ├─► postcodes.io            postcode validation
              └─► api.octopus.energy      region, products, rates
```

One GraphQL query replaces six or more REST calls and returns tariffs already priced for the customer's usage. The maths (rate selection, usage-weighted averages, yearly estimates) lives in `/lib` as pure, unit-tested functions. See [ADR 1](docs/decisions/0001-graphql-backend-for-frontend.md).

Try it locally:

```bash
curl -s localhost:3000/api/graphql -H 'content-type: application/json' \
  -d '{"query":"{ tariffComparison(regionCode: \"C\", annualKwh: 2700) { region { name } quotes { kind unitRatePence estimatedAnnualCostPence } } }"}'
```

## Getting started

Requires Node 24 and pnpm 10.

```bash
pnpm install
pnpm exec playwright install chromium
pnpm dev
```

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server on port 3000 |
| `pnpm build` | Production build |
| `pnpm lint` / `pnpm typecheck` | ESLint and TypeScript |
| `pnpm codegen` | Regenerate GraphQL types after schema or query changes |
| `pnpm test` | Unit, component and resolver tests (Vitest) |
| `pnpm test:e2e` | Playwright journey tests with axe accessibility scans |
| `pnpm lhci` | Lighthouse CI performance budgets (run after `pnpm build`) |
| `pnpm load` | k6 load test against a local production build (run after `pnpm build`; needs [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/)) |

## Performance

Lighthouse CI, median of 5 runs, mobile with slow 4G and a 4x CPU slowdown applied for real:

| Page | LCP | TBT | CLS | JavaScript |
| --- | --- | --- | --- | --- |
| Landing | 1.42s | 58ms | 0 | 212 KB |
| Postcode | 1.35s | 60ms | 0 | 212 KB |
| Usage | 1.42s | 57ms | 0 | 218 KB |
| Tariffs (cards) | 1.34s | 36ms | 0 | 230 KB |
| Tariffs (table, A/B test) | 1.37s | 40ms | 0 | 230 KB |
| Sign up | 1.37s | 74ms | 0 | 229 KB |

Budgets: LCP 2.5s, TBT 200ms, CLS 0.1, JavaScript 250 KB, accessibility 100. All pages score 100 for accessibility. See [ADR 2](docs/decisions/0002-caching-resilience-and-performance-budgets.md) for why throttling is applied rather than simulated.

## Funnel dashboard

[`/funnel`](app/funnel/page.tsx) shows how many people reach each step of the journey and where they leave: conversion from start to finish, sessions at each step with the share that continued, the biggest drop-off, how people gave their usage and which tariffs they chose. Periods: today, last 7 days, last 30 days.

- **Anonymous by design.** Events are built only from allow-listed values with a random per-tab session id. Every count is of distinct sessions, so refreshing a page does not inflate a step.
- **Storage.** In memory by default (nothing to set up, but it resets on restart and is per server). Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to use Redis, where sessions go into HyperLogLogs: they can count different sessions but cannot give the ids back. Data expires after 90 days.
- **Accessible and light.** A server-rendered page with no client JavaScript. Every number is written beside its bar, and the funnel is also available as a table. It is hidden from search engines; it holds no personal data, so it is not behind a login.

## A/B test: tariff cards or a comparison table

Half of visitors see the tariffs as cards, half as a comparison table. Which gets more people to choose a tariff?

- **Assigned before the page renders** in [`proxy.ts`](proxy.ts), and remembered in a cookie that holds only the layout name. `/tariffs` is quietly rewritten to one of two prebuilt pages, so there is no flicker or layout shift.
- **Measured** with the existing anonymous funnel, and **read** on `/funnel` with a two-proportion z-test, a planned sample size, and a verdict that will not name a winner too early.
- **Switched off** with `TARIFF_LAYOUT_EXPERIMENT=off`.

See [ADR 3](docs/decisions/0003-tariff-layout-ab-test.md) for the hypothesis, decision rule and what building it taught us (a wide table on a phone needs care).

## Load test

The question was not "how many requests can it take?" but **"does the caching strategy protect the upstream API during a spike?"** The Octopus API is a free public service we do not own, so if traffic reached it in proportion to our visitors, a price-change-day spike would hurt both of us.

[`load-tests/comparison.js`](load-tests/comparison.js) simulates that spike on the tariff comparison (the busiest, most expensive request): a ramp to a peak rate held for 60 seconds, across all 14 regions and 3 typical usages, plus a steady 2 postcode lookups a second. `pnpm load` runs it against a local production build and counts every request that reached an upstream API.

### Results

Run on 27 October 2026, one Next.js process on a MacBook, k6 on the same machine:

| | Before the fix | After, peak 200/s | After, peak 800/s |
| --- | --- | --- | --- |
| Requests | 16,070 | 16,312 | 61,007 |
| Failed | **84%** | 0% | 0% |
| Comparison p95 | 2.93s | 3.7ms | 2.1ms |
| Comparison p99 | 9.88s | 16.9ms | 7.5ms |
| Postcode lookup p95 | 5.6s | 5.8ms | 5.8ms |
| Requests reaching upstream APIs | 137 | 137 | 137 |

### What it showed

1. **The caching protected the upstream API from the start.** In every run, 137 requests reached Octopus and postcodes.io: one per distinct piece of data (14 regions × 3 tariffs × 3 endpoints, the product list and the 5 postcodes), whatever the traffic. At 800/s that is 1 upstream call per 445 requests.
2. **But our own server fell over.** The first run failed 84% of requests. A single warm comparison took about 45ms of CPU: it read 30 days of half-hourly Agile prices (1,440 records per region) from the cache and averaged them again on every request. That capped one process at about 20 comparisons a second.
3. **The fix was to cache the result, not just the data.** A pricing layer ([`graphql/pricing`](graphql/pricing)) now prices one tariff in one region once an hour and caches that small result. Each request only does the cost arithmetic for its usage. A warm comparison went from about 45ms to under 3ms, with identical prices, and the same process then handled 800 comparisons a second with no failures.
4. **It sends requests exactly as the browser does,** including the JSON content type Apollo Client puts on GET requests. That header once made every cached comparison fail with a server error (the Playwright tests caught it before release), so the load test would catch it coming back.

### What this does and does not prove

- It verifies the caching strategy and the cost of each request. It is not a production capacity figure.
- Locally there is no CDN, and `'use cache: remote'` falls back to in-memory. In production the CDN answers most repeat comparisons before they reach the server, and the shared remote cache adds a network round trip on each miss.
- k6 and the server shared one machine, so the latency figures are optimistic about the network and pessimistic about CPU.
- Pointing the test at a deployment mostly measures the CDN and counts against the host's limits, so the script defaults to localhost.

## Decisions worth knowing

- **The Agile chart** shows the average price for each half hour of the day over the last 30 days, in UK time, with the cheapest and dearest 3-hour windows labelled in words. It is hand-drawn SVG (no chart library, so no extra bundle weight), named by its title and a plain-English summary for screen readers, with every value in a table. Hover tooltips add detail but never hold information that is not also in the table.
- **Estimates for Agile and Tracker** use the last 30 days of prices, weighted by a typical household's daily usage pattern in UK time. They are always labelled as estimates.
- **Money:** rates stay as fractional pence; totals are rounded to whole pence once, at the end.
- **Scope:** electricity only, single-rate meters, Direct Debit prices inc VAT. Gas would follow the same datasource and resolver pattern.
- **Caching in layers:** the comparison is cached at the CDN (5 minutes, stale-while-revalidate), then in a shared server cache, before anything reaches the Octopus API. Only queries without personal data are sent as GET, so postcodes never appear in URLs.
- **Monitoring without personal data:** Sentry's data collection is switched off category by category and every event is scrubbed. Funnel events are built only from allow-listed values.
- **Product codes are never hard-coded.** Tariffs are relaunched often, so each type is found in the product list at runtime. Tracker is shown only when it is on sale.

## Status

- [x] Project setup, CLAUDE.md, technical proposal
- [x] GraphQL layer with live, cached tariff comparison
- [x] Pricing logic with unit tests; resolver tests with a fake datasource
- [x] App shell with skip link, independence notice and axe checks
- [x] Postcode step: region lookup, GOV.UK style errors, save and resume
- [x] Usage step: figure from a bill or a three-question estimate, refilled on return
- [x] Tariff comparison: live prices, cheapest label, Agile explainer, retry on outage
- [x] Agile price chart by time of day, with a text summary and a data table
- [x] Signup: GOV.UK-style manual address entry, server check that the postcode is real and in the priced region, startSwitch mutation, confirmation
- [x] Caching and resilience: shared server cache, CDN caching, timeouts and retries, partial results
- [x] Performance budgets (Lighthouse CI) and monitoring (Sentry, Speed Insights, anonymous funnel events)
- [x] Load test (k6) and write-up
- [x] Funnel dashboard at `/funnel`
- [x] A/B test of the tariff layout, with results on `/funnel`
- [ ] Storybook for the form kit
