import type { Page } from "@playwright/test";
import { expect, expectNoAxeViolations, test } from "./fixtures";
import { comparisonReply, mockGraphQL, regionReply } from "./graphqlMock";

const STORAGE_KEY = "switchboard:journey:v1";

/** Start on the usage step as someone who has already given their postcode. */
async function startWithRegion(page: Page, saved: Record<string, unknown> = {}) {
  await mockGraphQL(page, { TariffComparison: comparisonReply });
  await page.goto("/");
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [STORAGE_KEY, JSON.stringify({ regionCode: "C", ...saved })] as const,
  );
  await page.goto("/usage");
}

const continueButton = (page: Page) => page.getByRole("button", { name: "Continue" });

test.describe("usage step", () => {
  test("has no accessibility violations, including with errors showing", async ({ page }) => {
    await startWithRegion(page);
    await expect(page.getByText("Your region: London")).toBeVisible();
    await expectNoAxeViolations(page);

    await page.getByRole("radio", { name: /no, help me estimate it/i }).check();
    await continueButton(page).click();
    await expect(page).toHaveTitle("Error: Your usage | Switchboard");
    await expect(
      page.getByRole("heading", { name: "There is a problem" }).locator(".."),
    ).toBeFocused();
    await expectNoAxeViolations(page);
  });

  test("takes a figure from a bill through to the tariffs step", async ({ page }) => {
    await startWithRegion(page);
    await page.getByRole("radio", { name: /yes, i will enter it/i }).check();
    await page.getByRole("textbox", { name: /yearly electricity use/i }).fill("3,100 kWh");
    await continueButton(page).click();

    await expect(page).toHaveURL(/\/tariffs$/);
    await expect(page).toHaveTitle("Compare tariffs | Switchboard");
    await expect(page.getByRole("heading", { level: 1, name: "Compare tariffs" })).toBeFocused();
    await expect(page.getByText("3,100 kWh", { exact: true })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("can be answered with the keyboard alone", async ({ page, isMobile }) => {
    test.skip(isMobile, "Keyboard navigation is tested on desktop");
    await startWithRegion(page);

    // Focus the first radio, then use the arrow keys as screen reader users do.
    await page.getByRole("radio", { name: /yes, i will enter it/i }).focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("radio", { name: /no, help me estimate it/i })).toBeChecked();

    await page.keyboard.press("Tab");
    await page.keyboard.press("Space");
    await expect(page.getByRole("radio", { name: "Flat or maisonette" })).toBeChecked();

    await page.keyboard.press("Tab");
    await page.keyboard.type("1");
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/tariffs$/);
    await expect(page.getByText("1,300 kWh (estimated)")).toBeVisible();
  });

  test("refills previous answers when changing them from the tariffs step", async ({ page }) => {
    await startWithRegion(page);
    await page.getByRole("radio", { name: /no, help me estimate it/i }).check();
    await page.getByRole("radio", { name: /small house/i }).check();
    await page.getByRole("textbox", { name: "How many people live there?" }).fill("3");
    await page.getByRole("checkbox", { name: /heat pump/i }).check();
    await expect(page.getByText("5,800 kWh a year")).toBeVisible();
    await continueButton(page).click();

    await page.getByRole("link", { name: "Change yearly usage" }).click();
    await expect(page).toHaveURL(/\/usage$/);
    await expect(page.getByRole("radio", { name: /small house/i })).toBeChecked();
    await expect(page.getByRole("textbox", { name: "How many people live there?" })).toHaveValue("3");
    await expect(page.getByRole("checkbox", { name: /heat pump/i })).toBeChecked();

    // After a reload nothing is kept in memory, so this proves save and resume.
    await page.reload();
    await expect(page.getByRole("radio", { name: /small house/i })).toBeChecked();
    await expect(page.getByRole("textbox", { name: "How many people live there?" })).toHaveValue("3");
  });
});

test.describe("quote journey", () => {
  test("goes from the landing page to the tariffs step", async ({ page }) => {
    await mockGraphQL(page, {
      RegionLookup: regionReply("N", "South Scotland"),
      TariffComparison: comparisonReply,
    });

    await page.goto("/");
    await page.getByRole("link", { name: "Start now" }).click();
    await page.getByRole("textbox", { name: "What is your postcode?" }).fill("EH1 1YZ");
    await continueButton(page).click();

    await expect(page).toHaveURL(/\/usage$/);
    await page.getByRole("radio", { name: /yes, i will enter it/i }).check();
    await page.getByRole("textbox", { name: /yearly electricity use/i }).fill("2700");
    await continueButton(page).click();

    await expect(page).toHaveURL(/\/tariffs$/);
    // Earlier steps stay in the DOM (hidden) in Next.js 16, so scope to visible text.
    await expect(page.getByRole("definition").filter({ hasText: "South Scotland" })).toBeVisible();
    await expect(page.getByText("2,700 kWh", { exact: true })).toBeVisible();

    const stored = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
    expect(JSON.parse(stored ?? "{}")).toEqual({
      regionCode: "N",
      annualKwh: 2700,
      usage: { method: "known" },
    });
  });
});
