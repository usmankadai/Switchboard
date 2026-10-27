# Technical proposal: Switchboard

Status: accepted, October 2026. Owner: Usman.

## Problem

Switching energy supplier is one of the main ways people lower their bills, but quote journeys often ask for too much too early, hide the yearly cost behind jargon like "unit rate" and "standing charge", and are hard to use with a keyboard or screen reader.

Switchboard is a concept for the first few minutes of that journey: from postcode to a clear comparison of real tariffs, then a short signup. It has to be:

- **Accessible:** WCAG 2.2 AA, usable with keyboard and screen reader.
- **Honest:** real prices, with estimates clearly labelled as estimates.
- **Fast under load:** an onboarding page gets traffic spikes, for example when a price cap change is announced.
- **Owned end to end:** proposal, build, deploy and monitoring.

It is an independent concept using the public Octopus Energy API. It is not affiliated with Octopus Energy and never collects payment details.

## Requirements

1. A customer enters a postcode and sees their region.
2. They describe their home in a few questions, or enter kWh from a bill.
3. They see Flexible, Fixed, Tracker (when on sale) and Agile with real prices and an estimated yearly cost.
4. They can understand whether Agile suits them, with a chart that has a text and table alternative.
5. They can complete a short signup with clear validation, and come back later without losing progress.
6. The comparison stays fast and available when traffic spikes or the upstream API is slow.

## Options considered

### Data access: call the REST API from the browser, or add a backend for frontend

| Option | For | Against |
| --- | --- | --- |
| Browser calls Octopus REST directly | Simplest; no server code | Six or more calls per comparison; no shared cache, so every visitor hits the upstream API; business logic ends up in components |
| Next.js route handlers returning JSON | One call per screen; server caching | Each screen needs its own bespoke endpoint and types |
| **GraphQL backend for frontend (chosen)** | One query shaped for the UI; typed end to end with codegen; server caching in one place; the same pattern as a real onboarding stack | More moving parts; must earn its place by aggregating, not mirroring |

The comparison needs a region lookup, the product list, product details per tariff, unit rates, standing charges and 30 days of half-hourly Agile prices. `tariffComparison(regionCode, annualKwh)` returns all of it, already priced, in one request. Resolvers combine data; they do not mirror REST endpoints one to one.

### Caching: where and how long

Next.js 16 Cache Components, with `'use cache'` and `cacheLife` on each datasource function:

| Data | Changes | Cache life |
| --- | --- | --- |
| Postcode to region | Almost never | weeks |
| Product list and details | When tariffs relaunch | days |
| Unit rates, standing charges | Flexible quarterly, Agile daily | hours |

Time windows are rounded to whole days so every request on the same day shares a cache entry. Measured locally: a cold comparison takes about 2.2s (several upstream calls), a cached one about 0.05s.

### Estimating cost for tariffs whose price changes

There is no single unit rate for Agile or Tracker. Options:

- **Simple average of recent prices.** Easy, but overstates the value of cheap overnight prices that most homes do not use much.
- **Usage-weighted average (chosen).** Weight the last 30 days of half-hourly prices by a typical domestic usage profile, in UK local time. Closer to what a typical household would have paid.
- **Ask for smart meter data.** Most accurate, but needs account access, so out of scope.

The UI labels these figures as estimates based on recent prices, never as a quote.

### Money

Rates are fractional pence (for example 26.5956p per kWh). They stay as decimals exactly as received. Only calculated totals become integer pence, rounded once at the end, and are formatted only for display.

## Decision

Next.js 16 on Vercel, TypeScript strict, Apollo Server in a route handler as a backend for frontend, Apollo Client in the browser, GraphQL Code Generator for types. Pure business logic in `/lib` with unit tests. Playwright with axe for every journey page.

## Scope

In: electricity only, single-rate meters, Direct Debit prices inc VAT.

Out, on purpose: gas and dual fuel (same datasource and resolver pattern, so a straightforward extension), Economy 7 and other multi-rate meters, real address lookup (Royal Mail PAF data is licensed; a labelled fake lookup is used), real payments.

## Risks

| Risk | Mitigation |
| --- | --- |
| Upstream API slow or down | Cached entries keep serving; resolvers return a clear `UPSTREAM_UNAVAILABLE` error and the UI offers a retry |
| Product codes change when tariffs relaunch | Products are selected by type at runtime (`lib/products.ts`); a type with nothing on sale is left out |
| API returns `null` prices for brand new products | Prices are always read from the rates endpoints, never the product detail |
| API response shapes differ between products (Flexible uses `varying`, others `direct_debit_monthly`) | Runtime checks in the datasource rather than type assertions; found and fixed during build |
| Estimates mistaken for quotes | Clear "estimate" labelling and an explanation of the method |
| Load test only measures Vercel's cache | Framed as "verifying the caching strategy works", not as a capacity claim |
| Scope creep | Priority list in CLAUDE.md; accessibility and tests are never cut |

## Monitoring plan

- Sentry for client and server errors, with personal data scrubbed in `beforeSend`.
- Vercel Speed Insights for field Core Web Vitals, including INP, which lab tools cannot measure.
- Lighthouse CI lab budgets: LCP under 2.5s, CLS under 0.1, TBT under 200ms.
- Anonymous funnel events per step, to show where people drop off.
