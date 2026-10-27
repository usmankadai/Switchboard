# Tech stack

Everything Switchboard uses, what it is for, and where it lives. Versions are the ones installed on 27 October 2026 (`pnpm-lock.yaml` has the exact tree).

## Runtime and tooling

| Tool | Version | What it is for |
| --- | --- | --- |
| Node.js | 24.11 | Runs the app, the build and the tests |
| pnpm | 10.34 | Package manager (`packageManager` in `package.json`) |
| TypeScript | 5.9 | Strict typing everywhere (`tsconfig.json`, `strict: true`) |
| ESLint | 9.39 with `eslint-config-next` 16.4 | Linting, including Next.js and React rules |
| Homebrew | (system) | Used once, to install k6 on the development machine |

## The app

| Package | Version | What it is for | Where |
| --- | --- | --- | --- |
| `next` | 16.4.3 | The framework: App Router, Server Components, route handlers, Cache Components (`'use cache: remote'`), Partial Prefetching | `app/`, `next.config.ts` |
| `react`, `react-dom` | 19.3.0 | UI | everywhere |
| `server-only` | 0.0.1 | Stops server code (the funnel store) being imported into the browser by mistake | `lib/monitoring/funnelStore.ts` |
| CSS Modules | built into Next.js | Styling, scoped per component. No CSS framework | `*.module.css`, `app/globals.css` |
| Geist font | via `next/font/google` | The typeface, self-hosted by Next.js at build time | `app/layout.tsx` |

## Data layer (GraphQL)

| Package | Version | What it is for | Where |
| --- | --- | --- | --- |
| `graphql` | 16.14.2 | GraphQL itself. Pinned to v16 because Apollo does not support v17 yet | |
| `@apollo/server` | 5.5.1 | The GraphQL server (backend for frontend) | `app/api/graphql/route.ts`, `graphql/` |
| `@as-integrations/next` | 4.1.0 | Runs Apollo Server inside a Next.js route handler | `app/api/graphql/route.ts` |
| `@apollo/cache-control-types` | 1.0.3 | Typed cache hints, so partial results are never cached | `graphql/resolvers/tariffs.ts` |
| `@apollo/client` | 4.3.5 | GraphQL client in the browser: queries, mutations, cache | `app/(journey)/` |
| `@apollo/client-integration-nextjs` | 0.14.5 | Apollo Client with the App Router and server rendering | `app/ApolloWrapper.tsx` |
| `rxjs` | 7.8.2 | Required by Apollo Client 4 | |
| `@graphql-codegen/cli` | 7.4.6 | Generates TypeScript types from the schema and queries | `codegen.ts`, `generated/` |
| `@graphql-codegen/client-preset` | 6.2.3 | Typed `graphql()` function and fragment masking for components | `generated/` |
| `@graphql-codegen/typescript`, `typescript-resolvers` | 6.1 | Typed resolvers on the server | `generated/resolvers-types.ts` |
| `@graphql-typed-document-node/core` | 3.2.0 | Types used by the generated code | |

## External services

| Service | Needed? | What it is for | Key? |
| --- | --- | --- | --- |
| [Octopus Energy public API](https://developer.octopus.energy/docs/api/) | Yes | Regions, products, unit rates, standing charges, Agile half-hourly prices | No key |
| [postcodes.io](https://postcodes.io) | Yes | Checks a postcode is real | No key |
| Vercel | For deployment | Hosting, CDN, shared remote cache for `'use cache: remote'` | Account |
| Vercel Speed Insights (`@vercel/speed-insights` 2.0.0) | Optional | Real-user Core Web Vitals (LCP, CLS, INP). Only loads on Vercel | Enabled in Vercel |
| Sentry (`@sentry/nextjs` 11.9.0) | Optional | Error monitoring. Off unless `NEXT_PUBLIC_SENTRY_DSN` is set; loaded on demand in the browser | DSN |
| Upstash Redis (REST API) | Optional | Stores funnel counts for `/funnel`. Without it, counts are kept in memory. No SDK: plain `fetch` | URL and token |

## Testing and quality

| Tool | Version | What it is for | Where |
| --- | --- | --- | --- |
| Vitest | 5.0.5 | Unit and component tests | `**/*.test.ts(x)`, `vitest.config.mts` |
| `@vitejs/plugin-react` | 6.1.2 | JSX in Vitest | `vitest.config.mts` |
| jsdom | 30.1.3 | Browser-like environment for component tests | |
| React Testing Library (`@testing-library/react` 16.3, `dom` 10.4, `user-event` 14.6, `jest-dom` 7.0) | | Tests components the way a user uses them: by role and label | `app/**/*.test.tsx` |
| Apollo `MockedProvider` | part of `@apollo/client` | Fake GraphQL responses in component tests | |
| Playwright (`@playwright/test`) | 1.64.1 | End-to-end tests in Chromium, desktop and phone (Pixel 7) | `tests/e2e/`, `playwright.config.ts` |
| `@axe-core/playwright` | 4.14.0 | Automated WCAG 2.2 AA checks in every journey test | `tests/e2e/fixtures.ts` |
| Lighthouse CI (`@lhci/cli`) | 0.15.1 | Performance and accessibility budgets | `lighthouserc.cjs` |
| k6 | 2.3.0 | Load test of a traffic spike | `load-tests/` |
| Chromium | Playwright build 1248 | Browser for Playwright and Lighthouse CI | installed by `playwright install chromium` |

## Standards and guidance followed

- **WCAG 2.2 AA** accessibility, checked by axe and Lighthouse.
- **GOV.UK Design System patterns** for forms: error summary, inline errors, one question per page where it helps, labels as page headings.
- **Ofgem typical domestic consumption values** (July 2026) for the usage estimate.
- **UK GDPR and PECR** principles: no personal data stored, logged or sent to monitoring (see `functionality.md`).

## Not used, on purpose

- **No chart library.** The Agile chart is hand-written SVG to stay inside the 250 KB JavaScript budget.
- **No CSS framework or component library.** The form kit is small and accessible by design.
- **No database.** Nothing personal is stored. The only stored data are anonymous funnel counts.
- **No email service, address service or payment provider.** See "What is not real" in `functionality.md`.
