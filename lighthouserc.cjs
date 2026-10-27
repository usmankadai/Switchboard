/**
 * Lighthouse CI lab budgets for the journey pages. Run against a production
 * build: `pnpm build && pnpm lhci`.
 *
 * Lab runs cannot measure INP (there is no real interaction), so Total
 * Blocking Time is the lab proxy here. Real INP comes from Vercel Speed
 * Insights in production.
 *
 * Throttling is applied for real ("devtools"), not simulated. The simulated
 * mode estimated LCP at about 2.5s because it assumes the content paint also
 * waits for every script already downloading. The real paint does not: with
 * the same slow 4G and CPU slowdown applied, LCP measured about 1.35s. Script
 * weight is budgeted directly instead (resource-summary:script:size). See ADR 2.
 */
// Lighthouse CI loads this file with require(), so it has to be CommonJS.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { chromium } = require("@playwright/test");

const PORT = 3140;
// Both layouts of the tariff A/B test are measured directly: /tariffs itself
// would land on a random layout in each run (see proxy.ts and ADR 3).
const pages = ["/", "/postcode", "/usage", "/tariffs/cards", "/tariffs/table", "/signup"];

module.exports = {
  ci: {
    collect: {
      startServerCommand: `pnpm start --port ${PORT}`,
      startServerReadyPattern: "Ready",
      url: pages.map((path) => `http://localhost:${PORT}${path}`),
      // Local runs are noisy, so take 5 and judge the median of each metric.
      numberOfRuns: 5,
      // Reuse the Chromium that Playwright already installs.
      chromePath: process.env.CHROME_PATH ?? chromium.executablePath(),
      settings: {
        // Lighthouse's default mobile emulation with slow 4G and a 4x slower
        // CPU, the hardest realistic case for an onboarding journey, applied
        // for real rather than simulated.
        throttlingMethod: "devtools",
        chromeFlags: "--headless=new",
      },
    },
    assert: {
      assertions: {
        "largest-contentful-paint": ["error", { maxNumericValue: 2500, aggregationMethod: "median" }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1, aggregationMethod: "median" }],
        "total-blocking-time": ["error", { maxNumericValue: 200, aggregationMethod: "median" }],
        // Compressed JavaScript per page. Keeps slow phones fast.
        "resource-summary:script:size": ["error", { maxNumericValue: 250 * 1024 }],
        "categories:accessibility": ["error", { minScore: 1 }],
        "categories:performance": ["warn", { minScore: 0.9 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci/reports",
    },
  },
};
