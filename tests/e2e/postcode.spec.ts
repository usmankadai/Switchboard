import type { Page } from "@playwright/test";
import { expect, expectNoAxeViolations, test } from "./fixtures";

const STORAGE_KEY = "switchboard:journey:v1";

type GraphQLReply = Record<string, unknown>;

/** Answer the browser's GraphQL calls, so tests do not depend on live APIs. */
async function mockGraphQL(page: Page, ...replies: GraphQLReply[]) {
  const queue = [...replies];
  await page.route("**/api/graphql", async (route) => {
    const reply = queue.length > 1 ? queue.shift()! : queue[0];
    await route.fulfill({ json: reply });
  });
}

const london = { data: { region: { __typename: "Region", code: "C", name: "London" } } };

const notFound = {
  data: null,
  errors: [
    {
      message: "We could not find that postcode. Check it and try again",
      extensions: { code: "POSTCODE_NOT_FOUND", field: "postcode" },
    },
  ],
};

const upstreamDown = {
  data: null,
  errors: [
    {
      message: "We could not get prices right now. Please try again in a moment.",
      extensions: { code: "UPSTREAM_UNAVAILABLE" },
    },
  ],
};

const postcodeInput = (page: Page) =>
  page.getByRole("textbox", { name: "What is your postcode?" });

test.describe("postcode step", () => {
  test("is reached from the landing page and has no accessibility violations", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Start now" }).click();

    await expect(page).toHaveURL(/\/postcode$/);
    await expect(page).toHaveTitle("Your postcode | Switchboard");
    await expect(postcodeInput(page)).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("shows a focused error summary when left empty", async ({ page }) => {
    await page.goto("/postcode");
    await page.getByRole("button", { name: "Continue" }).click();

    const summary = page.getByRole("heading", { name: "There is a problem" }).locator("..");
    await expect(summary).toBeFocused();
    await expect(page).toHaveTitle("Error: Your postcode | Switchboard");
    await expect(postcodeInput(page)).toHaveAttribute("aria-invalid", "true");
    await expectNoAxeViolations(page);

    await page.getByRole("link", { name: "Enter your postcode" }).click();
    await expect(postcodeInput(page)).toBeFocused();
  });

  test("finds the region, saves only the region, and moves on", async ({ page }) => {
    await mockGraphQL(page, london);
    await page.goto("/postcode");

    await postcodeInput(page).fill("sw1a1aa");
    await postcodeInput(page).press("Enter");

    await expect(page).toHaveURL(/\/usage$/);
    await expect(page).toHaveTitle("Your usage | Switchboard");
    await expect(
      page.getByRole("heading", { level: 1, name: "How much electricity do you use?" }),
    ).toBeFocused();
    await expect(page.getByText("Your region: London")).toBeVisible();

    const stored = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
    expect(JSON.parse(stored ?? "{}")).toEqual({ regionCode: "C" });
    expect(stored).not.toMatch(/SW1A/i);
    await expectNoAxeViolations(page);
  });

  test("keeps the region after a refresh and when going back", async ({ page }) => {
    await mockGraphQL(page, london);
    await page.goto("/postcode");
    await postcodeInput(page).fill("SW1A 1AA");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/usage$/);

    await page.reload();
    await expect(page.getByText("Your region: London")).toBeVisible();

    await page.getByRole("link", { name: "Back" }).click();
    await expect(page).toHaveURL(/\/postcode$/);
    await expect(page.getByRole("link", { name: "Continue with London" })).toBeVisible();
  });

  test("explains when a postcode does not exist", async ({ page }) => {
    await mockGraphQL(page, notFound);
    await page.goto("/postcode");
    await postcodeInput(page).fill("ZZ1 1ZZ");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(
      page.getByRole("link", { name: "We could not find that postcode. Check it and try again" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/postcode$/);
  });

  test("offers a retry when the service is down", async ({ page }) => {
    await mockGraphQL(page, upstreamDown, london);
    await page.goto("/postcode");
    await postcodeInput(page).fill("SW1A 1AA");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(
      page.getByText("We could not check your postcode just now. Please try again in a moment."),
    ).toBeVisible();
    await expectNoAxeViolations(page);

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/usage$/);
  });

  test("asks for a postcode when someone lands on the usage step first", async ({ page }) => {
    await page.goto("/usage");
    await expect(page.getByRole("link", { name: "Enter your postcode" })).toBeVisible();
  });
});
