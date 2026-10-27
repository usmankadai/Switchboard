# Functionality

What Switchboard does, page by page, and what happens behind the scenes. Last checked on 27 October 2026.

Switchboard is an **independent concept**: a four-step electricity quote journey that uses real, live tariff prices from the public Octopus Energy API. It is not affiliated with Octopus Energy, and it does not switch anyone's energy supply.

## What is real, what is estimated, and what is a demo

| | Status | Detail |
| --- | --- | --- |
| Postcode check | **Real** | Checked against postcodes.io |
| Electricity region | **Real** | From the Octopus API (grid supply point for the postcode) |
| Tariffs shown | **Real** | Whatever Octopus currently sells to homes: Flexible, the 12 month Fixed, Agile, and Tracker when it is on sale. Found by type at runtime, never hard-coded |
| Unit rates and standing charges | **Real** | Live from the Octopus API, Direct Debit prices including VAT. VAT on domestic electricity is 0% from 1 October 2026, and the API's prices reflect that |
| Exit fees and contract length | **Real** | From the Octopus API |
| Agile price range and time-of-day chart | **Real** | The last 30 days of actual half-hourly Agile prices |
| Yearly cost for a usage you enter | **Calculated** | Real prices × your kWh + 365 days of standing charge. Assumes today's prices for a whole year, which the page says |
| Yearly cost for Agile | **Estimate** | The last 30 days of prices, weighted by a typical household's daily pattern of use. Your real cost depends on when you use electricity |
| The daily usage pattern used for that weighting | **Approximation** | Hand-shaped to follow the published Elexon domestic profile (low overnight, evening peak), not the official data |
| Usage estimate (home type, people, EV, heat pump) | **Estimate** | Flat, medium and large house use Ofgem's July 2026 typical figures (1,600, 2,500 and 3,800 kWh). The small-house figure (2,000 kWh) and the adjustments for people (300 kWh each), an EV (2,000 kWh) and a heat pump (3,500 kWh) are our assumptions |
| Supply address | **Real, typed by you** | Entered by hand, following the GOV.UK address pattern. There is no address lookup, because UK address data (Royal Mail PAF, Ordnance Survey AddressBase) needs a paid licence. The postcode is checked for real |
| Signup | **Demo** | Your name and email are checked, then thrown away. No account is created, no email is sent, and your supply does not change |
| Reference number | **Demo** | A random code such as SB-3F9A1C2E |
| "Switch within 5 working days" | **Real rule** | Suppliers must complete a switch within 5 working days (Ofgem), which the confirmation page describes |

## The journey

### Landing page (`/`)

- Explains the four steps and shows the independence notice.
- **Start now** goes to the postcode step.

### Step 1: postcode (`/postcode`)

- One question, "What is your postcode?", where the label is also the page heading.
- Accepts any common format (`sw1a1aa`, `SW1A 1AA`) and tidies it.
- Checks the format instantly, then checks the postcode is real and finds the electricity region.
- Clear errors: empty, wrong format, not found, outside Great Britain (Northern Ireland), or the service being down (with "try again" by pressing Continue).
- **Only the region is saved, never the postcode.**
- If you come back, it offers "Continue with London" (or your region).

### Step 2: usage (`/usage`)

- Shows your region with a link to change it.
- Asks whether you know your yearly usage:
  - **Yes:** enter the kWh from a bill. Accepts `2500`, `2,500` and `2500 kWh`. The hint shows Ofgem's typical figures.
  - **No:** answer three questions (type of home, number of people, electric car or heat pump) and see an estimate update as you answer.
- Errors are listed at the top in page order and next to each field. Switching between the two options clears errors that no longer apply.
- Your answers are saved, so they are filled in when you come back or reload.

### Step 3: compare tariffs (`/tariffs`)

- Shows your region and yearly usage, each with a change link.
- One card per tariff:
  - a plain-English description, and for Agile, that it needs a smart meter sending half-hourly readings
  - estimated cost a year and about a month
  - unit rate, standing charge, contract length and exit fee
  - a **Choose** button
- The cheapest tariff is labelled "Lowest estimated cost" in words. On a tie, nothing is labelled.
- **Is Agile right for you?** explains the real price range over 30 days (including when prices went below zero) and who it suits.
- **Agile price chart:** the average price for each half hour of the day over 30 days, in UK time, with the cheapest and dearest 3 hours labelled. It has:
  - a written summary, for example "lowest on average from 11:30 to 14:30"
  - hover tooltips
  - a full table of all 48 half hours
- When prices were checked, in UK time.
- If prices cannot be fetched: a focused "Prices are not available" message with **Try again**.
- If one tariff cannot be priced: the others are still shown, with a note naming the missing one and **Try again**.

### Step 4: sign up (`/signup`), demo

- Shows the tariff you chose and its estimated cost.
- Full name and email address, with browser autofill.
- **Supply address:** typed in by hand, following the GOV.UK address pattern: address line 1, address line 2 (optional), town or city, and postcode, with browser autofill. When you submit, the server checks the postcode is real and **stops you if it is in a different region from your prices**, because tariffs are priced by region. Only the postcode is sent; the address lines never leave your browser.
- A tick box confirming you understand it is a demo.
- No payment fields. The page says a real switch would ask for them here.
- **Confirm and switch** sends your details to the server, which checks them again with the same rules and returns a made-up reference.

### Confirmation (`/confirmation`), demo

- "Switch request received" with the reference number.
- The tariff you chose and its estimated cost.
- "This was a demo" and what would happen in a real switch.
- **Start again** clears everything saved.
- The page survives a reload, because only the non-personal reference is saved.

### Funnel dashboard (`/funnel`)

- How many people started, how many reached each step, and conversion from start to finish.
- The biggest drop-off between two steps, in a sentence.
- How people gave their usage (bill or estimate) and which tariffs they chose.
- Periods: today, last 7 days, last 30 days. Also available as a table.
- Counts are distinct anonymous sessions. Stored in memory, or in Redis when configured.
- Hidden from search engines. Server-rendered with no client JavaScript.

### Other pages

- **Page not found** with a link back to the start.
- **Something went wrong** with **Try again**, keeping your saved answers.

## Accessibility

Built to WCAG 2.2 AA and checked automatically by axe on every journey page, plus a Lighthouse accessibility score of 100 on every page.

- Skip link to the main content.
- On every step change, focus moves to the new heading and the page title updates.
- GOV.UK-style error summary that takes focus, with links to each field, plus inline errors read out by screen readers. The page title starts with "Error:" while errors show.
- Native inputs, radios, checkboxes and selects with visible labels, hints and fieldsets.
- Loading and progress messages announced to screen readers.
- Nothing relies on colour alone, including the chart.
- Charts have a text summary and a table.
- Large, high-contrast focus styles. Respects reduced motion.
- Works on phones: tested at Pixel 7 size, no sideways scrolling, chart text stays readable.

## Saving your progress

- Kept in your browser (`localStorage`): region, usage answers, yearly kWh, chosen tariff and the demo reference.
- **Never kept:** names, emails, addresses or full postcodes.
- Anything unexpected in storage is ignored. If storage is blocked, the journey still works.

## Speed and reliability

- **One request for the whole comparison:** a GraphQL layer combines region, products, rates and 30 days of Agile prices.
- **Three layers of caching:**
  - the CDN keeps comparisons for 5 minutes
  - a shared server cache keeps each tariff's priced result for an hour
  - raw upstream data is cached for hours to weeks
- Stale data is served while it refreshes, so short upstream outages are invisible.
- Upstream calls time out after 6 seconds and retry once.
- **Measured:**
  - LCP about 1.35s and blocking time under 40ms on a throttled phone
  - 212 to 229 KB of JavaScript per page
  - in a local load test, one server handled 800 comparisons a second with no failures, and only 137 requests reached the upstream APIs

## Privacy and monitoring

- **Error monitoring (Sentry):** only when configured. All data collection categories switched off, and every event scrubbed of emails, postcodes, request bodies and query strings.
- **Postcodes never appear in URLs,** so they never reach CDN or server logs.
- **Funnel events:** built only from allow-listed values (step, viewed or completed, and a fixed list of details) with a random per-tab id.
- **Real-user performance:** Vercel Speed Insights, on Vercel only.

## Known limits

- **One supplier only.** Only Octopus publishes an open tariff API, so this is not a whole-of-market comparison.
- **Electricity only, single-rate meters.** No gas, dual fuel or Economy 7.
- **No smart meter check.** It tells you Agile needs a smart meter, but does not check whether you have one.
- **Estimates use today's prices for a whole year.** If the 0% VAT on electricity ends (reported as running until 31 March 2027), costs would be about 5% higher.
- **The Agile estimate uses a typical day,** not your actual pattern of use.
- **Great Britain only.** Northern Ireland postcodes are recognised, and the app explains that Northern Ireland has a separate electricity market.
- **The funnel's default memory store** resets on restart and is per server.
