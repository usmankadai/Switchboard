import { expect, expectNoAxeViolations, test } from "./fixtures";

const NOTICE =
  "Independent concept. Tariff data from the public Octopus Energy API. Not affiliated with Octopus Energy.";

test.describe("landing page", () => {
  test("explains the journey and has no accessibility violations", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/Switchboard/);
    await expect(
      page.getByRole("heading", { level: 1, name: /switching energy/i }),
    ).toBeVisible();
    await expect(page.getByRole("list").getByRole("listitem")).toHaveCount(4);

    await expectNoAxeViolations(page);
  });

  test("shows the independence notice on the page and in the footer", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("main").getByText(NOTICE)).toBeVisible();
    await expect(page.getByRole("contentinfo").getByText(NOTICE)).toBeVisible();
  });

  test("lets keyboard users skip straight to the content", async ({ page, isMobile }) => {
    test.skip(isMobile, "Keyboard navigation is tested on desktop");
    await page.goto("/");

    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "Skip to main content" });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
  });
});
