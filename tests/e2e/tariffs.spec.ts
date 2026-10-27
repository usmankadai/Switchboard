import type { Page } from "@playwright/test";
import { expect, expectNoAxeViolations, test } from "./fixtures";
import { comparisonReply, errorReply, mockGraphQL, regionReply } from "./graphqlMock";

const STORAGE_KEY = "switchboard:journey:v1";

async function startOnTariffs(page: Page) {
  await page.goto("/");
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [
      STORAGE_KEY,
      JSON.stringify({ regionCode: "C", annualKwh: 2700, usage: { method: "known" } }),
    ] as const,
  );
  await page.goto("/tariffs");
}

const tariffList = (page: Page) => page.getByRole("list", { name: "Tariffs" });

test.describe("tariff comparison", () => {
  test("shows each tariff with costs and has no accessibility violations", async ({ page }) => {
    await mockGraphQL(page, { TariffComparison: comparisonReply });
    await startOnTariffs(page);

    await expect(tariffList(page).getByRole("listitem")).toHaveCount(3);
    const flexible = page.getByRole("listitem", { name: "Flexible Octopus" });
    await expect(flexible.getByText("Lowest estimated cost")).toBeVisible();
    await expect(flexible.getByText("£869 a year")).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Is Agile Octopus right for you?" }),
    ).toBeVisible();
    await expect(page.getByText("Prices checked at 12:00 on 27 October 2026.")).toBeVisible();

    await expectNoAxeViolations(page);
  });

  test("recovers from an outage with Try again", async ({ page }) => {
    await mockGraphQL(page, {
      TariffComparison: [
        errorReply("We could not get prices right now.", "UPSTREAM_UNAVAILABLE"),
        comparisonReply,
      ],
    });
    await startOnTariffs(page);

    const problem = page.getByRole("heading", { name: "Prices are not available" }).locator("..");
    await expect(problem).toBeFocused();
    await expectNoAxeViolations(page);

    await page.getByRole("button", { name: "Try again" }).click();
    await expect(tariffList(page).getByRole("listitem")).toHaveCount(3);
  });

  test("goes from postcode to a chosen tariff", async ({ page }) => {
    await mockGraphQL(page, {
      RegionLookup: regionReply("C", "London"),
      TariffComparison: comparisonReply,
    });

    await page.goto("/postcode");
    await page.getByRole("textbox", { name: "What is your postcode?" }).fill("SW1A 1AA");
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByRole("radio", { name: /yes, i will enter it/i }).check();
    await page.getByRole("textbox", { name: /yearly electricity use/i }).fill("2700");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page).toHaveURL(/\/tariffs$/);
    await page.getByRole("button", { name: "Choose Agile Octopus" }).click();

    await expect(page).toHaveURL(/\/signup$/);
    await expect(page).toHaveTitle("Sign up | Switchboard");
    await expect(page.getByRole("heading", { level: 1, name: "Your details" })).toBeFocused();
    // Read from Apollo's cache, so no second comparison request is needed.
    await expect(page.getByText("You chose Agile Octopus, estimated at £899 a year.")).toBeVisible();
    await expectNoAxeViolations(page);
  });
});
