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

  test("explains Agile prices with a chart, a summary and a table", async ({ page }) => {
    await mockGraphQL(page, { TariffComparison: comparisonReply });
    await startOnTariffs(page);

    const chart = page.getByRole("img", { name: /Average price by time of day/ });
    await expect(chart).toBeVisible();
    await expect(page.getByText(/lowest on average from 00:00 to 03:00/)).toBeVisible();

    await page.getByText("Show prices by time of day as a table").click();
    const table = page.getByRole("table", { name: /Average Agile price by time of day/ });
    await expect(table.getByRole("row")).toHaveCount(49);
    await expectNoAxeViolations(page);
  });

  test("shows the price for a half hour on hover", async ({ page, isMobile }) => {
    test.skip(isMobile, "Hover is a pointer interaction");
    await mockGraphQL(page, { TariffComparison: comparisonReply });
    await startOnTariffs(page);

    const chart = page.getByRole("img", { name: /Average price by time of day/ });
    // The chart is below the fold, and a raw mouse move does not scroll.
    await chart.scrollIntoViewIfNeeded();
    const box = await chart.boundingBox();
    if (!box) throw new Error("Chart has no size");
    // The plot starts 40px in and ends 8px from the right; aim at 16:00 (slot 32 of 48).
    const plotWidth = box.width - 48;
    await page.mouse.move(box.x + 40 + plotWidth * (32.5 / 48), box.y + box.height / 2);
    // The tooltip: value first (strong), then the time. The table row with the
    // same time is hidden inside a closed <details>.
    await expect(page.locator("strong", { hasText: /^46\.00p per kWh$/ })).toBeVisible();
    await expect(page.locator("span", { hasText: /^16:00 to 16:30$/ })).toBeVisible();
  });

  test("fits a phone screen with readable labels", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Phone layout");
    await mockGraphQL(page, { TariffComparison: comparisonReply });
    await startOnTariffs(page);

    const chart = page.getByRole("img", { name: /Average price by time of day/ });
    await expect(chart).toBeVisible();
    const sizes = await page.evaluate(() => {
      const svg = document.querySelector('svg[role="img"]') as SVGSVGElement;
      const label = svg.querySelector("text") as SVGTextElement;
      return {
        pageOverflows: document.documentElement.scrollWidth > window.innerWidth,
        svgWidth: svg.getBoundingClientRect().width,
        frameWidth: (svg.parentElement as HTMLElement).getBoundingClientRect().width,
        labelFontPx: label.getBoundingClientRect().height,
      };
    });
    expect(sizes.pageOverflows).toBe(false);
    expect(Math.abs(sizes.svgWidth - sizes.frameWidth)).toBeLessThan(2);
    // Drawn at its real width, so 12px labels stay about 12px, not scaled down.
    expect(sizes.labelFontPx).toBeGreaterThan(10);
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
