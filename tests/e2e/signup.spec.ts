import type { Page } from "@playwright/test";
import { expect, expectNoAxeViolations, test } from "./fixtures";
import { comparisonReply, errorReply, mockGraphQL, startSwitchReply } from "./graphqlMock";

const STORAGE_KEY = "switchboard:journey:v1";
const TARIFF_ID = "E-1R-OE-FIX-12M-26-10-27-C";

async function startOnSignup(page: Page, startSwitch: Record<string, unknown> = startSwitchReply(TARIFF_ID)) {
  await mockGraphQL(page, {
    TariffComparison: comparisonReply,
    StartSwitch: startSwitch,
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

async function fillForm(page: Page) {
  await page.getByRole("textbox", { name: "Full name" }).fill("Sam Taylor");
  await page.getByRole("textbox", { name: "Email address" }).fill("sam@example.com");
  await page.getByRole("textbox", { name: "Address line 1" }).fill("10 Downing Street");
  await page.getByRole("textbox", { name: "Town or city" }).fill("London");
  await page.getByRole("textbox", { name: "Postcode" }).fill("SW1A 2AA");
  await page.getByRole("checkbox", { name: /I understand this is a demo/ }).check();
}

const storedJourney = (page: Page) =>
  page.evaluate((key) => localStorage.getItem(key) ?? "", STORAGE_KEY);

test.describe("signup step", () => {
  test("has no accessibility violations, with and without errors", async ({ page }) => {
    await startOnSignup(page);
    await expect(page.getByText("You chose Octopus 12M Fixed")).toBeVisible();
    await expect(page.getByRole("group", { name: "Supply address" })).toBeVisible();
    await expectNoAxeViolations(page);

    await page.getByRole("button", { name: "Confirm and switch" }).click();
    await expect(page).toHaveTitle("Error: Sign up | Switchboard");
    await expect(
      page.getByRole("heading", { name: "There is a problem" }).locator(".."),
    ).toBeFocused();
    await expect(
      page.getByRole("link", { name: "Enter address line 1, typically the building and street" }),
    ).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("signs up, confirms, survives a reload and starts again", async ({ page }) => {
    await startOnSignup(page);

    // Only name, email and postcode are sent. Address lines stay in the browser.
    const sent = page.waitForRequest(
      (request) =>
        request.url().endsWith("/api/graphql") &&
        request.method() === "POST" &&
        request.postDataJSON()?.operationName === "StartSwitch",
    );
    await fillForm(page);
    await page.getByRole("button", { name: "Confirm and switch" }).click();
    const input = (await sent).postDataJSON().variables.input;
    expect(Object.keys(input).sort()).toEqual(["email", "fullName", "regionCode", "supplyPostcode", "tariffId"]);
    expect(JSON.stringify(input)).not.toMatch(/Downing|London/);

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
    expect(stored).not.toMatch(/Sam|example\.com|Downing|London|SW1A/);

    await page.reload();
    await expect(page.getByText("SB-3F9A1C2E")).toBeVisible();

    await page.getByRole("button", { name: "Start again" }).click();
    await expect(page).toHaveURL(/\/$/);
    expect(await storedJourney(page)).toBe("");
  });

  test("clears personal details from the page after signing up", async ({ page }) => {
    await startOnSignup(page);
    await fillForm(page);
    await page.getByRole("button", { name: "Confirm and switch" }).click();
    await expect(page).toHaveURL(/\/confirmation$/);

    // Next.js keeps the signup page in the DOM, hidden. Its fields must be empty.
    const hiddenValues = await page
      .locator("input#full-name, input#email, input#address-line-1, input#address-town, input#address-postcode")
      .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value));
    expect(hiddenValues).toHaveLength(5);
    expect(hiddenValues.every((value) => value === "")).toBe(true);
  });

  test("stops a supply address outside the priced region", async ({ page }) => {
    const message =
      "This postcode is in North Scotland, but your prices are for London. Go back to the start to get prices for this address.";
    await startOnSignup(page, {
      ...errorReply(message, "BAD_USER_INPUT", "address-postcode"),
      errors: [
        {
          message,
          extensions: {
            code: "BAD_USER_INPUT",
            field: "address-postcode",
            fieldErrors: [{ field: "address-postcode", message }],
          },
        },
      ],
    });
    await fillForm(page);
    await page.getByRole("button", { name: "Confirm and switch" }).click();

    await expect(page.getByRole("link", { name: message })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Postcode" })).toHaveAttribute("aria-invalid", "true");
    await expect(page).toHaveURL(/\/signup$/);
  });
});
