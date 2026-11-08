# Learning the Switchboard tech stack

Want to build something like Switchboard? This page lists free resources for every tool and idea used in it, from the basics of the web to load testing.

Every link was checked and working on 27 October 2026. Official documentation comes first, because it is the most accurate and the most up to date. Each section also says what the tool does in Switchboard and where to see it in this repository, so you can read the docs and the real code side by side.

## How to use this page

You do not need to learn everything at once. A sensible order:

1. **Foundations:** HTML, CSS, JavaScript, then TypeScript.
2. **React:** components, state and effects.
3. **Next.js:** pages, layouts, Server Components, data and caching.
4. **Accessibility:** alongside React and Next.js, not after. It is much easier to build in than to add later.
5. **GraphQL and Apollo:** the data layer.
6. **Testing:** unit and component tests, then end-to-end tests.
7. **Performance, caching and load testing.**
8. **Monitoring, privacy and deployment.**

Build small things as you go. The quickest way to learn is to change something in this repository, run the tests and see what breaks.

## 1. Web foundations

**Used in Switchboard for:** everything. The pages are plain, semantic HTML with CSS, and the browser APIs below do real jobs.

- [MDN: Learn web development](https://developer.mozilla.org/en-US/docs/Learn_web_development): the best free starting point for HTML, CSS and JavaScript.
- [web.dev: Learn HTML](https://web.dev/learn/html), [Learn CSS](https://web.dev/learn/css) and [Learn JavaScript](https://web.dev/learn/javascript): short, modern courses from the Chrome team.
- [The Modern JavaScript Tutorial](https://javascript.info/): thorough, from basics to async code.
- [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)

Browser APIs used in this project:

| API | What it does here | Learn it |
| --- | --- | --- |
| `localStorage` | Save and resume the journey | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) |
| `sessionStorage` | The anonymous funnel session id | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage) |
| `navigator.sendBeacon` | Sends funnel events without slowing the page | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon) |
| `ResizeObserver` | Redraws the Agile chart at its real width | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) |
| `AbortSignal.timeout` | 6 second timeout on upstream API calls | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static) |
| `Intl.DateTimeFormat` | UK time (Europe/London) for half-hour slots and dates | [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat) |
| `Intl.NumberFormat` | Pounds, kWh and percentages | [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) |
| SVG | The Agile price chart | [MDN: SVG from scratch](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorials/SVG_from_scratch) |

**See it in this repo:** [lib/journey-storage.ts](lib/journey-storage.ts), [lib/monitoring/funnel.ts](lib/monitoring/funnel.ts), [lib/usage-profile.ts](lib/usage-profile.ts).

## 2. TypeScript

**Used in Switchboard for:** every file, in strict mode, with no `any`.

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html): read it in order.
- [Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html): how to check `unknown` data safely. This project does it for every API response.
- [The `strict` option](https://www.typescriptlang.org/tsconfig/#strict)

**See it in this repo:** the runtime checks on API data in [graphql/datasources/octopus.ts](graphql/datasources/octopus.ts) and [lib/journey-storage.ts](lib/journey-storage.ts).

## 3. Tools you run every day

- **Node.js:** [Introduction to Node.js](https://nodejs.org/en/learn/getting-started/introduction-to-nodejs)
- **pnpm** (package manager): [why pnpm](https://pnpm.io/motivation) and [adding packages](https://pnpm.io/cli/add)
- **Git:** [Pro Git book](https://git-scm.com/book/en/v2), free online. Plus [GitHub's Hello World](https://docs.github.com/en/get-started/start-your-journey/hello-world)
- **ESLint:** [getting started](https://eslint.org/docs/latest/use/getting-started)
- **Homebrew** (installing tools such as k6 on a Mac): [brew.sh](https://brew.sh/)

## 4. React

**Used in Switchboard for:** all the UI: the form kit, the journey steps, the tariff cards and the chart.

- [React: Learn](https://react.dev/learn): the official course. Start here.
- [Thinking in React](https://react.dev/learn/thinking-in-react): how to break a page into components.
- [You might not need an effect](https://react.dev/learn/you-might-not-need-an-effect): saves a lot of bugs.

Features this project leans on:

- [`useId`](https://react.dev/reference/react/useId): unique ids for labels and error summaries.
- [`useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore): reading saved progress from storage safely.
- [`useLayoutEffect`](https://react.dev/reference/react/useLayoutEffect): resetting busy buttons when a page is hidden.
- [`<Suspense>`](https://react.dev/reference/react/Suspense): showing "Loading" while the funnel dashboard streams in.
- [`<Activity>`](https://react.dev/reference/react/Activity): how Next.js keeps recent pages alive in the background. Read this before you wonder why a page still has its state.

**See it in this repo:** [components/](components), [app/(journey)/](app/(journey)).

## 5. Next.js

**Used in Switchboard for:** pages, layouts, the API routes, server rendering and caching. This project uses **Next.js 16**, which changed a lot. Read the current docs, not old tutorials. The exact docs for the installed version are also in `node_modules/next/dist/docs/`.

- [Next.js Learn](https://nextjs.org/learn): the free official course. Build the dashboard app it walks you through.
- [Next.js docs](https://nextjs.org/docs)
- [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components): the most important idea in the App Router.

Caching (the heart of this project's performance):

- [Caching](https://nextjs.org/docs/app/getting-started/caching)
- [`'use cache'`](https://nextjs.org/docs/app/api-reference/directives/use-cache) and [`'use cache: remote'`](https://nextjs.org/docs/app/api-reference/directives/use-cache-remote). Read why plain `'use cache'` does not persist on serverless hosting.
- [`cacheLife`](https://nextjs.org/docs/app/api-reference/functions/cacheLife)
- [`connection`](https://nextjs.org/docs/app/api-reference/functions/connection)
- [Preserving UI state](https://nextjs.org/docs/app/guides/preserving-ui-state): why pages stay mounted after you navigate away.

Other features used:

- [Route handlers](https://nextjs.org/docs/app/getting-started/route-handlers): the GraphQL and events endpoints.
- [`error.js`](https://nextjs.org/docs/app/api-reference/file-conventions/error) and [`not-found.js`](https://nextjs.org/docs/app/api-reference/file-conventions/not-found)
- [Instrumentation](https://nextjs.org/docs/app/guides/instrumentation): how Sentry starts on the server.
- [Metadata](https://nextjs.org/docs/app/getting-started/metadata-and-og-images): page titles and `noindex`.
- [Fonts](https://nextjs.org/docs/app/api-reference/components/font) (`next/font`) and the [Geist font](https://vercel.com/font)
- [CSS in Next.js](https://nextjs.org/docs/app/getting-started/css), including CSS Modules. Background on the idea: [CSS Modules](https://github.com/css-modules/css-modules).
- [Testing with Vitest](https://nextjs.org/docs/app/guides/testing/vitest) and [with Playwright](https://nextjs.org/docs/app/guides/testing/playwright)
- [Official examples](https://github.com/vercel/next.js/tree/canary/examples)

**See it in this repo:** [app/](app), [graphql/datasources/octopus.ts](graphql/datasources/octopus.ts), [graphql/pricing/cachedTariffPricing.ts](graphql/pricing/cachedTariffPricing.ts), [instrumentation.ts](instrumentation.ts).

## 6. GraphQL and Apollo

**Used in Switchboard for:** a backend for frontend that turns six or more REST calls into one query shaped for the page.

GraphQL itself:

- [Learn GraphQL](https://graphql.org/learn/), especially [queries](https://graphql.org/learn/queries/) and [schemas and types](https://graphql.org/learn/schema/).
- [The backend for frontend pattern](https://samnewman.io/patterns/architectural/bff/) by Sam Newman: why this project has a GraphQL layer at all.

Apollo Server (the server side):

- [Apollo Server docs](https://www.apollographql.com/docs/apollo-server)
- [Caching and `@cacheControl`](https://www.apollographql.com/docs/apollo-server/performance/caching): how comparisons are cached at the CDN.
- [CSRF prevention](https://www.apollographql.com/docs/apollo-server/security/cors#preventing-cross-site-request-forgery-csrf): why the client sends `apollo-require-preflight`.
- [Error handling](https://www.apollographql.com/docs/apollo-server/data/errors): error codes such as `BAD_USER_INPUT`.
- [Apollo Server integration for Next.js](https://github.com/apollo-server-integrations/apollo-server-integration-next)

Apollo Client (the browser side). This project uses **Apollo Client 4**, which handles errors differently from version 3, so check you are reading the right version.

- [Apollo Client docs](https://www.apollographql.com/docs/react)
- [Queries](https://www.apollographql.com/docs/react/data/queries), [mutations](https://www.apollographql.com/docs/react/data/mutations) and [error handling](https://www.apollographql.com/docs/react/data/error-handling)
- [Fragments](https://www.apollographql.com/docs/react/data/fragments): each tariff card asks for its own data.
- [HTTP link](https://www.apollographql.com/docs/react/api/link/apollo-link-http): sending some queries as GET.
- [Testing with `MockedProvider`](https://www.apollographql.com/docs/react/development-testing/testing)
- [Apollo Client with the Next.js App Router](https://github.com/apollographql/apollo-client-integrations)
- [Apollo's free tutorials](https://www.apollographql.com/tutorials/): hands-on courses.
- [RxJS overview](https://rxjs.dev/guide/overview): Apollo Client 4 is built on it. You rarely touch it directly.

GraphQL Code Generator (typed queries):

- [GraphQL Code Generator](https://the-guild.dev/graphql/codegen)
- [React guide](https://the-guild.dev/graphql/codegen/docs/guides/react-vue)
- [Client preset](https://the-guild.dev/graphql/codegen/plugins/presets/preset-client): the `graphql()` function and fragment masking.
- [Typed resolvers](https://the-guild.dev/graphql/codegen/plugins/typescript/typescript-resolvers)

**See it in this repo:** [graphql/schema/typeDefs.ts](graphql/schema/typeDefs.ts), [graphql/resolvers/](graphql/resolvers), [app/(journey)/tariffs/TariffCard.tsx](app/(journey)/tariffs/TariffCard.tsx), [codegen.ts](codegen.ts), [ADR 1](docs/decisions/0001-graphql-backend-for-frontend.md).

## 7. Accessibility

**Used in Switchboard for:** every page targets WCAG 2.2 AA. This is the part most worth learning well.

Start here:

- [W3C: Introduction to web accessibility](https://www.w3.org/WAI/fundamentals/accessibility-intro/)
- [web.dev: Learn Accessibility](https://web.dev/learn/accessibility): a free course.
- [The A11Y Project checklist](https://www.a11yproject.com/checklist/)

Reference:

- [WCAG 2.2 quick reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/). Remember the first rule: use native HTML before ARIA.
- [W3C forms tutorial](https://www.w3.org/WAI/tutorials/forms/)
- [W3C: complex images such as charts](https://www.w3.org/WAI/tutorials/images/complex/): why the Agile chart has a summary and a table.
- [WebAIM contrast checker](https://webaim.org/resources/contrastchecker/)

The GOV.UK Design System (the form patterns in this project come from here):

- [GOV.UK Design System](https://design-system.service.gov.uk/)
- [Error summary](https://design-system.service.gov.uk/components/error-summary/) and [error message](https://design-system.service.gov.uk/components/error-message/)
- [Radios](https://design-system.service.gov.uk/components/radios/) and [question pages](https://design-system.service.gov.uk/patterns/question-pages/)
- [Addresses](https://design-system.service.gov.uk/patterns/addresses/): the pattern the signup step follows for the supply address.
- [Form structure](https://www.gov.uk/service-manual/design/form-structure) and the original [one thing per page](https://designnotes.blog.gov.uk/2015/07/03/one-thing-per-page/) post.

Test with a real screen reader:

- [NVDA](https://www.nvaccess.org/download/) (free, Windows) and [VoiceOver](https://support.apple.com/guide/voiceover/welcome/mac) (built into Macs).

**See it in this repo:** [components/ErrorSummary.tsx](components/ErrorSummary.tsx), [components/TextInput.tsx](components/TextInput.tsx), [components/stepNavigation.ts](components/stepNavigation.ts), [app/(journey)/tariffs/AgilePriceChart.tsx](app/(journey)/tariffs/AgilePriceChart.tsx).

## 8. Testing

**Used in Switchboard for:** about 240 unit and component tests and about 60 end-to-end tests, with accessibility checks on every journey page.

The big picture:

- [The practical test pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) by Martin Fowler's team: which kind of test to write for what.

Unit and component tests:

- [Vitest guide](https://vitest.dev/guide/) and [mocking](https://vitest.dev/guide/mocking)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Which query to use](https://testing-library.com/docs/queries/about/#priority): query by role and label, as a user would.
- [user-event](https://testing-library.com/docs/user-event/intro): typing and clicking like a person.
- [jest-dom matchers](https://github.com/testing-library/jest-dom) such as `toHaveAccessibleDescription`.
- [Common mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [jsdom](https://github.com/jsdom/jsdom): the pretend browser the tests run in. Know its limits (no layout, no `ResizeObserver`).

End-to-end tests:

- [Playwright: getting started](https://playwright.dev/docs/intro)
- [Locators](https://playwright.dev/docs/locators): finding things the accessible way.
- [Mocking APIs](https://playwright.dev/docs/mock): how the tests avoid live APIs.
- [Accessibility testing](https://playwright.dev/docs/accessibility-testing), using [axe-core](https://github.com/dequelabs/axe-core).
- [Emulation](https://playwright.dev/docs/emulation): testing at phone size.

**See it in this repo:** any `*.test.ts(x)` file, [tests/e2e/](tests/e2e), [tests/e2e/graphqlMock.ts](tests/e2e/graphqlMock.ts).

## 9. Web performance

**Used in Switchboard for:** Lighthouse CI budgets that fail the build if pages get slow, and real-user measurements.

- [web.dev: Learn Performance](https://web.dev/learn/performance): a free course.
- [Core Web Vitals](https://web.dev/articles/vitals), then each metric: [LCP](https://web.dev/articles/lcp), [CLS](https://web.dev/articles/cls), [INP](https://web.dev/articles/inp) and [TBT](https://web.dev/articles/tbt) (the lab stand-in for INP).
- [Lighthouse overview](https://developer.chrome.com/docs/lighthouse/overview)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci): its [getting started](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/getting-started.md) and [configuration](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md) guides.

**See it in this repo:** [lighthouserc.cjs](lighthouserc.cjs), [ADR 2](docs/decisions/0002-caching-resilience-and-performance-budgets.md).

## 10. HTTP caching and security

**Used in Switchboard for:** three layers of caching, so a traffic spike barely touches the upstream API.

- [MDN: HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching): read this first.
- [`Cache-Control`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)
- [`stale-while-revalidate`](https://web.dev/articles/stale-while-revalidate)
- [`CDN-Cache-Control` (RFC 9213)](https://www.rfc-editor.org/rfc/rfc9213)
- [Vercel's CDN cache](https://vercel.com/docs/caching/cdn-cache)
- [OWASP: cross-site request forgery](https://owasp.org/www-community/attacks/csrf): why GET requests to the API need protecting.

**See it in this repo:** [graphql/cacheHeaders.ts](graphql/cacheHeaders.ts), [app/api/graphql/route.ts](app/api/graphql/route.ts), [graphql/datasources/http.ts](graphql/datasources/http.ts).

## 11. Load testing with k6

**Used in Switchboard for:** simulating a price-change-day spike. The test found that the server fell over at 200 requests a second, and showed the fix handling 800.

- [k6 documentation](https://grafana.com/docs/k6/latest/) and [installing k6](https://grafana.com/docs/k6/latest/set-up/install-k6/)
- [Write your first test](https://grafana.com/docs/k6/latest/get-started/write-your-first-test/)
- [Scenarios](https://grafana.com/docs/k6/latest/using-k6/scenarios/): the spike and the steady postcode lookups.
- [Thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/): pass or fail rules.
- [Spike testing](https://grafana.com/docs/k6/latest/testing-guides/test-types/spike-testing/)

**See it in this repo:** [load-tests/comparison.js](load-tests/comparison.js), [load-tests/run-local.sh](load-tests/run-local.sh), and the "Load test" section of the [README](README.md).

## 12. A/B testing

**Used in Switchboard for:** testing whether a comparison table gets more people to choose a tariff than cards.

- [Next.js: Proxy](https://nextjs.org/docs/app/getting-started/proxy) and its [reference](https://nextjs.org/docs/app/api-reference/file-conventions/proxy): assigning a variant before the page renders.
- [MDN: cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies): keeping a visitor in one group.
- [GOV.UK: A/B testing](https://www.gov.uk/guidance/ab-testing-comparative-studies): when and how to run one.
- [How not to run an A/B test](https://www.evanmiller.org/how-not-to-run-an-ab-test.html) by Evan Miller: why you must not stop as soon as a result looks significant. And his [sample size calculator](https://www.evanmiller.org/ab-testing/sample-size.html).
- [Comparing two proportions](https://online.stat.psu.edu/stat415/lesson/9/9.4) (Penn State): the z-test behind the verdict.
- [Trustworthy Online Controlled Experiments](https://experimentguide.com/): the standard book on experimentation, by Kohavi, Tang and Xu.
- [W3C tables tutorial](https://www.w3.org/WAI/tutorials/tables/), [CSS `position: sticky`](https://developer.mozilla.org/en-US/docs/Web/CSS/position) and [scrollable regions must be focusable](https://dequeuniversity.com/rules/axe/4.10/scrollable-region-focusable): building the accessible comparison table.

**See it in this repo:** [proxy.ts](proxy.ts), [lib/experiments.ts](lib/experiments.ts), [lib/monitoring/abTest.ts](lib/monitoring/abTest.ts), [app/(journey)/tariffs/TariffTable.tsx](app/(journey)/tariffs/TariffTable.tsx), [ADR 3](docs/decisions/0003-tariff-layout-ab-test.md).

## 13. Monitoring and analytics

**Used in Switchboard for:** error tracking, real-user speed data and an anonymous funnel, all without personal data.

- [Sentry for Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/) and [scrubbing sensitive data](https://docs.sentry.io/platforms/javascript/guides/nextjs/data-management/sensitive-data/)
- [Vercel Speed Insights](https://vercel.com/docs/speed-insights)
- [Upstash Redis REST API](https://upstash.com/docs/redis/features/restapi): Redis over plain HTTP.
- [Redis HyperLogLog](https://redis.io/docs/latest/develop/data-types/probabilistic/hyperloglogs/): counting distinct sessions without storing them.

**See it in this repo:** [lib/monitoring/](lib/monitoring), [app/funnel/page.tsx](app/funnel/page.tsx), [instrumentation-client.ts](instrumentation-client.ts).

## 14. Privacy and data protection (UK)

**Used in Switchboard for:** no personal data is stored, logged or sent to monitoring, and postcodes never appear in URLs.

- [ICO: UK GDPR guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/)
- [Data minimisation](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/): collect only what you need. The guiding idea of this project.
- [ICO: storage and access technologies](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/): the rules on cookies, `localStorage` and analytics (PECR).

## 15. Deployment

- [Vercel docs](https://vercel.com/docs) and [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)
- [The Twelve-Factor App](https://12factor.net/): why settings such as the Sentry DSN live in environment variables.
- [GitHub Actions docs](https://docs.github.com/en/actions) and [building and testing Node.js](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs): running every check automatically on each pull request.
- [pnpm on CI](https://pnpm.io/continuous-integration) and [Playwright on CI](https://playwright.dev/docs/ci).

**See it in this repo:** [.env.example](.env.example) and [.github/workflows/ci.yml](.github/workflows/ci.yml).

## 16. The energy data and domain

**Used in Switchboard for:** live tariffs and prices, and understanding what they mean.

- [Octopus Energy API basics](https://developer.octopus.energy/rest/guides/api-basics) and [API reference](https://developer.octopus.energy/rest/reference)
- [Guy Lipman's guide to the Octopus API](https://www.guylipman.com/octopus/api_guide.html): an excellent community walkthrough with examples.
- [postcodes.io overview](https://postcodes.io/docs/overview) and [API docs](https://postcodes.io/docs/api)
- [Agile Octopus](https://octopus.energy/agile/): how half-hourly pricing works.
- [Ofgem: the energy price cap](https://www.ofgem.gov.uk/information-consumers/energy-advice-households/energy-price-cap)
- [Ofgem: typical domestic consumption values, 2026 decision](https://www.ofgem.gov.uk/sites/default/files/2026-05/Review%20of%20typical%20domestic%20consumption%20values%20decision.pdf): the usage figures behind the estimate.
- [Elexon: profile classes](https://www.elexon.co.uk/knowledgebase/profile-classes/): how typical daily usage patterns are defined.

**See it in this repo:** [graphql/datasources/octopus.ts](graphql/datasources/octopus.ts), [lib/products.ts](lib/products.ts), [lib/estimate.ts](lib/estimate.ts), [lib/usage.ts](lib/usage.ts).

## 17. Ways of working

**Used in Switchboard for:** writing down decisions, and writing in plain English.

- [Architecture decision records](https://adr.github.io/) and the original [documenting architecture decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) post by Michael Nygard.
- [GOV.UK: writing for GOV.UK](https://www.gov.uk/guidance/content-design/writing-for-gov-uk): the plain English style used in this project's copy and docs.

**See it in this repo:** [docs/technical-proposal.md](docs/technical-proposal.md), [docs/decisions/](docs/decisions), [CLAUDE.md](CLAUDE.md).

## A few lessons from building this

- **Read the docs for the version you have installed.** Next.js 16, Apollo Client 4 and Sentry 11 all changed in ways that older tutorials get wrong.
- **Measure before you optimise.** The load test, not a guess, found the real bottleneck.
- **Accessibility and privacy are easiest when they are designed in from the first commit.**
- **Check your facts.** Official figures change, for example Ofgem's typical usage values in July 2026, and links move. Even this page will age.

## Related documents

- [techStack.md](techStack.md): every tool, with versions.
- [functionality.md](functionality.md): what the app does, and what is real, estimated or demo.
- [README.md](README.md): how to run it.
