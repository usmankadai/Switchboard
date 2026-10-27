import AxeBuilder from "@axe-core/playwright";
import { expect, test as base, type Page } from "@playwright/test";

/**
 * Every journey test should call `expectNoAxeViolations(page)` once the page
 * is in the state being tested. Any violation fails the build.
 */
export async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();

  const summary = results.violations.map(
    (violation) =>
      `${violation.id} (${violation.impact}): ${violation.help}\n  ${violation.nodes
        .map((node) => node.target.join(" "))
        .join("\n  ")}`,
  );
  expect(summary, "accessibility violations").toEqual([]);
}

/**
 * Every test starts in the "cards" group of the tariff layout A/B test, so
 * results never depend on a coin toss. Tests about the experiment itself
 * clear or change this cookie.
 */
export const test = base.extend({
  // Playwright passes the fixture callback second; named `provide` so React lint rules do not mistake it for a hook.
  context: async ({ context, baseURL }, provide) => {
    await context.addCookies([{ name: "sb-tariff-layout", value: "cards", url: baseURL! }]);
    await provide(context);
  },
});
export { expect };
