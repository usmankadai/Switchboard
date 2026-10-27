import type { Page } from "@playwright/test";
import { expect, expectNoAxeViolations, test } from "./fixtures";
import { comparisonReply, mockGraphQL, regionReply, startSwitchReply } from "./graphqlMock";

const STORAGE_KEY = "switchboard:journey:v1";
const TARIFF_ID = "E-1R-OE-FIX-12M-26-10-27-C";

async function startOnSignup(page: Page) {
  await mockGraphQL(page, {
    TariffComparison: comparisonReply,
    RegionLookup: regionReply("C", "London"),
    StartSwitch: startSwitchReply(TARIFF_ID),
  });
  await page.goto("/");
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [
      STORAGE_KEY,
      JSON.stringify({
        regionCode: "C",
        annualKwh: 2700,
        usage: { method: "known" },
        tariffId: TARIFF_ID,
      }),
    ] as const,
  );
  await page.goto("/signup");
}

const storedJourney = (page: Page) =>
  page.evaluate((key) => localStorage.getItem(key) ?? "", STORAGE_KEY);

test.describe("signup step", () => {
  test("has no accessibility violations, with and without errors", async ({ page }) => {
    await startOnSignup(page);
    await expect(page.getByText("You chose Octopus 12M Fixed")).toBeVisible();
    await expectNoAxeViolations(page);

    await page.getByRole("button", { name: "Confirm and switch" }).click();
    await expect(page).toHaveTitle("Error: Sign up | Switchboard");
    await expect(
      page.getByRole("heading", { name: "There is a problem" }).locator(".."),
    ).toBeFocused();
    await expectNoAxeViolations(page);
  });

  test("signs up, confirms, survives a reload and starts again", async ({ page }) => {
    await startOnSignup(page);

    await page.getByRole("textbox", { name: "Full name" }).fill("Sam Taylor");
    await page.getByRole("textbox", { name: "Email address" }).fill("sam@example.com");
    await page.getByRole("textbox", { name: "Postcode" }).fill("SW1A 1AA");
    await page.getByRole("button", { name: "Find address" }).click();

    const select = page.getByRole("combobox", { name: "Select your address" });
    await select.selectOption("12 Sample Road, SW1A 1AA");
    await expectNoAxeViolations(page);

    await page.getByRole("checkbox", { name: /I understand this is a demo/ }).check();
    await page.getByRole("button", { name: "Confirm and switch" }).click();

    await expect(page).toHaveURL(/\/confirmation$/);
    await expect(page).toHaveTitle("Switch request received | Switchboard");
    await expect(
      page.getByRole("heading", { level: 1, name: "Switch request received" }),
    ).toBeFocused();
    await expect(page.getByText("SB-3F9A1C2E")).toBeVisible();
    await expectNoAxeViolations(page);

    // Nothing personal was saved.
    const stored = await storedJourney(page);
    expect(stored).toContain("SB-3F9A1C2E");
    expect(stored).not.toMatch(/Sam|example\.com|Sample Road|SW1A/);

    await page.reload();
    await expect(page.getByText("SB-3F9A1C2E")).toBeVisible();

    await page.getByRole("button", { name: "Start again" }).click();
    await expect(page).toHaveURL(/\/$/);
    expect(await storedJourney(page)).toBe("");
  });

  test("clears personal details from the page after signing up", async ({ page }) => {
    await startOnSignup(page);
    await page.getByRole("textbox", { name: "Full name" }).fill("Sam Taylor");
    await page.getByRole("textbox", { name: "Email address" }).fill("sam@example.com");
    await page.getByRole("textbox", { name: "Postcode" }).fill("SW1A 1AA");
    await page.getByRole("button", { name: "Find address" }).click();
    await page.getByRole("combobox", { name: "Select your address" }).selectOption({ index: 1 });
    await page.getByRole("checkbox", { name: /I understand this is a demo/ }).check();
    await page.getByRole("button", { name: "Confirm and switch" }).click();
    await expect(page).toHaveURL(/\/confirmation$/);

    // Next.js keeps the signup page in the DOM, hidden. Its fields must be empty.
    const hiddenValues = await page
      .locator("input#full-name, input#email")
      .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value));
    expect(hiddenValues.every((value) => value === "")).toBe(true);
  });

  test("stops a supply address outside the priced region", async ({ page }) => {
    await startOnSignup(page);
    await page.unrouteAll();
    await mockGraphQL(page, {
      TariffComparison: comparisonReply,
      RegionLookup: regionReply("P", "North Scotland"),
    });

    await page.getByRole("textbox", { name: "Postcode" }).fill("SW1A 1AA");
    await page.getByRole("button", { name: "Find address" }).click();

    await expect(
      page.getByRole("link", { name: /This postcode is in North Scotland/ }),
    ).toBeVisible();
    await expect(page.getByRole("combobox")).toHaveCount(0);
  });
});
