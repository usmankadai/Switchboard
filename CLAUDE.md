# CLAUDE.md

Guidance for Claude Code when working in this repository.

@AGENTS.md

## Project overview

**Switchboard** is an unofficial concept of a consumer energy onboarding journey: postcode to region, usage estimate, tariff comparison with real prices, and a multi-step signup. It uses the public Octopus Energy API for product and tariff data.

It is a portfolio project built to demonstrate the skills of a Frontend Engineer on an onboarding team: accessibility, performance under high traffic, strong testing, and ownership of the full cycle from technical proposal to monitoring.

### Branding rule (important)

- This is NOT an Octopus Energy product and must never look like one.
- Use Switchboard's own name, logo, colours and copy. Never use Octopus logos, wordmarks, mascots or brand styling.
- Show a visible notice in the footer and on the landing page: "Independent concept. Tariff data from the public Octopus Energy API. Not affiliated with Octopus Energy."
- The signup flow is a demo. It must never collect real payment or bank details. Use clearly fake placeholder fields or omit them.

### Scope decisions

- **Electricity only, single-rate meters.** Gas, dual fuel and Economy 7 are out of scope. Agile is electricity only anyway, so this keeps the most interesting tariffs. The README notes that gas would follow the same datasource and resolver pattern.
- **Consumer prices are inc-VAT.** The API returns both `value_exc_vat` and `value_inc_vat`; always use the inc-VAT fields.
- **Direct Debit prices.** Where rates are split by `payment_method`, use `DIRECT_DEBIT` (or `null`, meaning it applies to all methods).
- **Address lookup is fake.** Full UK address data (Royal Mail PAF) is licensed. Use a clearly labelled fake lookup with sample addresses. Postcodes are validated for real with postcodes.io (free, no key).

## Tech stack

- React 19 with TypeScript (strict mode)
- Next.js 16 (App Router, Cache Components enabled), deployed on Vercel
- GraphQL: Apollo Server 5 (in a Next.js route handler via `@as-integrations/next`) and Apollo Client 4 (via `@apollo/client-integration-nextjs`)
- GraphQL Code Generator for typed operations, hooks and resolver types
- React Testing Library with Vitest for unit and component tests
- Playwright for end-to-end tests, with `@axe-core/playwright` for accessibility checks
- Planned: Sentry (errors), Vercel Speed Insights (field Core Web Vitals), Lighthouse CI (lab budgets), k6 (load test)

Package manager: pnpm. `graphql` is pinned to v16 because Apollo's packages do not yet support v17.

## Commands

```bash
pnpm install          # install dependencies
pnpm dev              # run the dev server
pnpm build            # production build
pnpm lint             # ESLint
pnpm typecheck        # tsc --noEmit
pnpm codegen          # regenerate GraphQL types and hooks
pnpm test             # Vitest + RTL (single run)
pnpm test:watch       # Vitest in watch mode
pnpm test:e2e         # Playwright (includes axe checks)
```

Added later, as the matching priority is reached: `pnpm lhci` (Lighthouse CI) and `pnpm load` (k6).

Before considering any task done, run: `pnpm lint && pnpm typecheck && pnpm test`. For changes to the journey, also run `pnpm test:e2e`.

## Architecture

```
/app
  /(journey)            # quote and signup steps
    /postcode
    /usage
    /tariffs
    /signup
    /confirmation
  /api/graphql/route.ts # Apollo Server handler
/graphql
  /schema               # SDL type definitions (in .ts files with a /* GraphQL */ tag)
  /resolvers            # resolvers, one file per domain
  /datasources          # Octopus and postcodes.io clients, with caching
/components             # shared UI components (accessible form kit lives here)
/lib                    # pure logic: cost estimation, usage models, rate selection, formatting
/generated              # codegen output, never edit by hand
/tests/e2e              # Playwright specs
/load-tests             # k6 scripts (later)
/docs
  technical-proposal.md # problem, options, decision, risks
  decisions/            # short ADRs for notable choices
```

Client operations and fragments are written with the codegen `graphql()` function, colocated with the component that uses them. There is no separate operations folder.

### Why a GraphQL layer

The REST API needs several calls to build one comparison screen (region lookup, product list, product detail, unit rates, standing charges, and 30 days of Agile prices). The GraphQL layer is a backend-for-frontend that aggregates these into a single query shaped for the UI: `tariffComparison(regionCode, annualKwh)`. It takes a region code, not a postcode: the postcode step resolves the region once with `region(postcode)`, so later steps never need the full postcode. Keep that justification true: resolvers should combine and shape data, not just mirror REST endpoints one to one.

### Data source

- Base URL: `https://api.octopus.energy/v1/`. Products and tariffs are public and unauthenticated. No API key is needed or should be added.
- Region: `/industry/grid-supply-points/?postcode=` returns a group id such as `_C`. Tariff codes end with the region letter, for example `E-1R-AGILE-24-10-01-C`.
- Products: `/products/` and `/products/{code}/`. Tariff details are under `single_register_electricity_tariffs[region]`, keyed by payment type: `direct_debit_monthly` for most products, but `varying` for Flexible. Check both.
- Rates: `/products/{product}/electricity-tariffs/{tariff}/standard-unit-rates/` and `/standing-charges/`.
- **Always read prices from the rates endpoints, not the product detail.** Newly launched products can return `null` prices in the detail response.
- **Product codes change.** Fixed tariffs are relaunched often (for example `OE-FIX-12M-26-10-27`) and Tracker is sometimes closed to new customers. Never hard-code product codes; select them from the product list with `lib/products.ts`, and leave a tariff type out of the comparison when no product exists for it.
- All external calls go through `/graphql/datasources`. Components and resolvers never call `fetch` on an external API directly.

### Caching and performance

- Cache Components is on, so cache with `'use cache'` plus an explicit `cacheLife` profile in the datasource functions. Do not use the old `export const revalidate` route config.
- Product list, product detail and region lookups change rarely: `cacheLife('days')` or longer.
- Unit rates, standing charges and Agile prices: `cacheLife('hours')`. Agile prices for the next day are published each afternoon.
- Keep cache keys stable: round time windows (such as "the last 30 days") to whole days before passing them to a cached function.
- Handle upstream failures gracefully: serve cached data when available, otherwise show a clear, accessible error with a retry.
- **Lab budgets (Lighthouse CI):** LCP under 2.5s, CLS under 0.1, TBT under 200ms on the journey pages. Lighthouse cannot measure INP, because there is no real interaction in a lab run; TBT is the lab proxy.
- **Field data:** measure real INP (under 200ms), LCP and CLS with Vercel Speed Insights or the `web-vitals` library.
- **Pages stay alive after navigation.** With Cache Components, Next.js keeps up to 3 recent routes mounted but hidden (React `<Activity>`), with their state and DOM. So: ids must be unique across pages (use `useId` for shared components); reset transient state such as busy flags in a `useLayoutEffect` cleanup; and in Playwright, scope text queries to visible elements because hidden steps are still in the DOM. Read `node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md`.
- Keep client JavaScript lean. Prefer Server Components; use Client Components only where interactivity is needed.

## Coding conventions

- TypeScript strict. No `any`; use `unknown` and narrow it.
- Use generated types from `/generated`. After changing the schema or any `graphql()` document, run `pnpm codegen`.
- Use Apollo fragments for data a component needs, colocated with that component.
- Business logic (annual cost estimates, usage profiles, rate and product selection) lives in `/lib` as pure functions with unit tests. Do not put it in components or resolvers.
- **Money:** unit rates and standing charges are fractional pence (for example 24.5p per kWh or 41.3869p per day). Store them as decimals exactly as received. Only calculated totals are integer pence, rounded once at the end of the calculation, and formatted only at the display edge. Label units clearly in the UI.
- Small, focused components. Name files after the component they export.
- No new dependencies without a one-line reason in the PR description.

### Estimating cost for variable tariffs

Agile and Tracker prices change daily, so there is no single rate to multiply by.

- Method: take the last 30 days of half-hourly prices and weight each by a typical domestic daily usage profile (`lib/usage-profile.ts`), giving a usage-weighted average unit rate. Annual cost is that rate times annual kWh plus 365 days of standing charge.
- Half-hour slots are matched to the profile in UK local time (Europe/London), not UTC.
- The UI must label these figures as estimates based on recent prices, never as a quote. Agile prices can be negative, so the maths must handle that.

## Accessibility (non-negotiable)

Target WCAG 2.2 AA on every page.

- Semantic HTML first. Use native `<button>`, `<input>`, `<fieldset>` and `<legend>` before reaching for ARIA.
- Every input has a visible `<label>`. Placeholders are never the only label.
- Forms use an error summary at the top on submit (GOV.UK pattern), linked to each invalid field, plus inline errors announced to screen readers.
- On each step change, move focus to the step heading and update the page `<title>`. Use `StepHeading` for the h1 and call `markStepNavigation()` right before `router.push` to the next step. Prefix the title with "Error: " while a form shows errors.
- Reuse the form kit in `/components` (`TextInput`, `ErrorSummary`, `Button`, `StepHeading`) rather than writing new inputs.
- Full keyboard support, visible focus styles, and no keyboard traps.
- Colour contrast at least 4.5:1 for text. Never use colour alone to convey meaning, including in charts.
- Charts (such as Agile prices) include a text summary and an accessible data table alternative.
- Respect `prefers-reduced-motion`.
- Every Playwright journey test runs an axe scan; a new violation fails the build.

## Testing

- **Unit (Vitest):** all functions in `/lib`, especially cost estimation edge cases (negative prices, missing slots, clock changes).
- **Component (RTL):** Client Components and synchronous Server Components only. Test behaviour as a user would: query by role and label, not test IDs or class names. Wrap Apollo components in `MockedProvider`.
- **Async Server Components:** Vitest and RTL cannot render them (Next.js recommends end-to-end tests). Cover them with Playwright, and keep their logic thin by moving it into `/lib`.
- **End-to-end (Playwright):** mock GraphQL by operation name with `tests/e2e/graphqlMock.ts` so runs never depend on live APIs. Cover the happy path, validation errors, back-button and refresh behaviour, save and resume, and upstream API failure (mock with `page.route`).
- **Resolvers:** test aggregation logic with a mocked datasource.
- Write or update tests in the same change as the code. Do not mark a task done with failing or skipped tests.

## Privacy, saving progress and monitoring

- **Save and resume** stores only non-personal journey data in `localStorage`: postcode region code, usage answers, annual kWh and chosen tariff. Never store names, emails, phone numbers, addresses or full postcodes there. Personal details live in component state for the current page only.
- Sentry captures client and server errors. Do not send personal data (names, emails, addresses, postcodes) to Sentry; scrub them in `beforeSend`.
- Track journey funnel events (step viewed, step completed, step abandoned) with anonymous identifiers only.

## Scope and priorities

Polish beats breadth. Priority order when time is short:

1. Postcode, usage and tariff comparison steps, fully accessible and tested
2. Signup step with validation, save and resume, and confirmation
3. Caching, error handling and performance budgets
4. Monitoring and funnel tracking
5. Load test and its write-up in the README
6. Nice to have: A/B test at the edge, Storybook for the form kit

Never cut accessibility or tests to add a lower-priority feature.

## Working style

- Work like a team: one GitHub issue per piece of work, with acceptance criteria; small PRs with clear descriptions.
- Record notable decisions as short ADRs in `/docs/decisions`.
- Keep `docs/technical-proposal.md` up to date if the approach changes.
- Writing style for all docs, UI copy and PR descriptions: British English, plain and friendly, and no em dashes.
