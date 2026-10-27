# 3. A/B test: tariff cards or a comparison table

Date: 27 October 2026. Status: accepted.

## Context

The tariff comparison is where the journey is won or lost: people either choose a tariff or leave. We show tariffs as cards. A comparison table puts the same facts side by side, which might make choosing easier, or might feel heavier, especially on a phone. We should find out from behaviour, not opinion.

## Hypothesis

Showing tariffs in a comparison table, instead of cards, increases the share of people who choose a tariff.

## Design

| | |
| --- | --- |
| **Variants** | `cards` (the control, unchanged) and `table`. Same tariffs, same facts, same wording (shared in `tariffCopy.ts`); only the layout differs |
| **Split** | 50/50, at random, per browser |
| **Primary measure** | Of the sessions that saw the tariffs step, the share that chose a tariff |
| **Unit** | Distinct anonymous sessions, counted with the existing funnel (HyperLogLog in Redis) |
| **Decision rule** | Two-sided two-proportion z-test at 5% significance, only once each layout has at least 100 sessions |
| **Planned size** | About 1,565 sessions per layout to detect a 5 percentage point change from a 50% baseline with 80% power; the dashboard recalculates this from the control's real rate |

## How it works

- **Assignment before rendering.** `proxy.ts` runs on requests for `/tariffs`. A visitor without the `sb-tariff-layout` cookie is assigned a layout at random; the cookie keeps them there for 30 days. The request is rewritten to `/tariffs/cards` or `/tariffs/table`, so the address bar still says `/tariffs`.
- **Both layouts are prebuilt static pages** (`app/(journey)/tariffs/[layout]`). There is no flicker, no layout shift and no client-side assignment code, unlike tools that swap content in the browser.
- **Measurement.** Funnel events from the tariffs step carry the layout (`variant`), checked against an allow-list on the server.
- **Results** are on `/funnel`, with each layout's choose rate, the p-value and a plain-English verdict that refuses to name a winner too early.
- **Kill switch.** `TARIFF_LAYOUT_EXPERIMENT=off` sends everyone to the cards and sets no cookie.

## Privacy

- The cookie holds only `cards` or `table`, a value shared with half of all visitors. It identifies nobody and links to nothing.
- UK law (PECR, as amended by the Data (Use and Access) Act 2025) lets storage for statistical purposes that improve a service run without consent, provided people are told clearly and can object. A public launch therefore needs the privacy notice and opt-out already listed as launch requirements. Until then, this is a demo.

## Things we learned building it

- **Phones.** A seven-column table does not fit a phone, so it scrolls sideways inside a labelled, keyboard-reachable region, with the tariff column held in place and a visible hint. Phone users must swipe to reach Choose, so **split the results by device before rolling the table out**: it could win on desktop and lose on phones.
- **Do not peek and stop.** Stopping the first time a result looks significant makes false winners far more likely. Decide the sample size first, then read the result once.

## Consequences

- One more cookie, `proxy.ts`, and a second prebuilt tariffs page.
- Tests always pin a layout (the Playwright fixture sets `cards` by default), so results never depend on a coin toss.
- When the test ends, keep the winner, remove the loser and the proxy rewrite, and record the result here.
