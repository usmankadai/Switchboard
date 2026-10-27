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

## Decisions worth knowing

- **Estimates for Agile and Tracker** use the last 30 days of prices, weighted by a typical household's daily usage pattern in UK time. They are always labelled as estimates.
- **Money:** rates stay as fractional pence; totals are rounded to whole pence once, at the end.
- **Scope:** electricity only, single-rate meters, Direct Debit prices inc VAT. Gas would follow the same datasource and resolver pattern.
- **Product codes are never hard-coded.** Tariffs are relaunched often, so each type is found in the product list at runtime. Tracker is shown only when it is on sale.

## Status

- [x] Project setup, CLAUDE.md, technical proposal
- [x] GraphQL layer with live, cached tariff comparison
- [x] Pricing logic with unit tests; resolver tests with a fake datasource
- [x] App shell with skip link, independence notice and axe checks
- [x] Postcode step: region lookup, GOV.UK style errors, save and resume
- [ ] Usage and tariff steps
- [ ] Signup with save and resume, and confirmation
- [ ] Monitoring, performance budgets and load test write-up
