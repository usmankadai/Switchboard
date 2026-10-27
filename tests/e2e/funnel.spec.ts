import { randomUUID } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";
import { expect, expectNoAxeViolations, test } from "./fixtures";

/**
 * The dashboard reads the shared in-memory store of the test server, which
 * other tests also send events to in parallel. So these tests send their
 * own journeys and check counts are at least that many, never exact.
 */
async function sendJourney(request: APIRequestContext, lastStep: number) {
  const sessionId = randomUUID();
  const steps = ["postcode", "usage", "tariffs", "signup", "confirmation"].slice(0, lastStep);
  for (const step of steps) {
    const response = await request.post("/api/events", {
      data: { sessionId, step, action: "viewed" },
    });
    expect(response.status()).toBe(204);
  }
  if (lastStep >= 3) {
    await request.post("/api/events", {
      data: { sessionId, step: "tariffs", action: "completed", detail: "tariff-agile" },
    });
  }
}

const numberIn = async (text: Promise<string>) => Number((await text).replace(/[^\d]/g, ""));

test.describe("funnel dashboard", () => {
  test.skip(({ isMobile }) => isMobile, "One device is enough for the counting checks");

  test("counts journeys by step and has no accessibility violations", async ({ page, request }) => {
    await sendJourney(request, 5);
    await sendJourney(request, 3);
    await sendJourney(request, 1);

    await page.goto("/funnel?range=1");
    await expect(page).toHaveTitle("Journey funnel | Switchboard");
    await expect(page.getByRole("link", { name: "Today" })).toHaveAttribute("aria-current", "page");

    const started = page.getByText("Started", { exact: true }).locator("..");
    expect(await numberIn(started.locator("p").last().innerText())).toBeGreaterThanOrEqual(3);

    const steps = page.getByRole("region", { name: "Sessions at each step" }).getByRole("listitem");
    await expect(steps).toHaveCount(5);
    await expect(steps.first()).toContainText("Postcode");
    await expect(page.getByText(/^Biggest drop-off:/)).toBeVisible();

    const tariffs = page.getByRole("region", { name: "Tariffs chosen" });
    await expect(tariffs.getByText("Agile")).toBeVisible();

    await page.getByText("Show the funnel as a table").click();
    await expect(page.getByRole("table", { name: /Sessions at each step/ }).getByRole("row")).toHaveCount(6);
    await expectNoAxeViolations(page);
  });

  test("never lets a later step show more sessions than an earlier one", async ({ page, request }) => {
    await sendJourney(request, 2);
    await page.goto("/funnel?range=1");

    const rows = page.getByRole("region", { name: "Sessions at each step" }).getByRole("listitem");
    const counts: number[] = [];
    for (const row of await rows.all()) {
      const value = await row.locator("span").nth(1).innerText();
      counts.push(Number(value.split("·")[0]!.replace(/[^\d]/g, "")));
    }
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  test("switches period with links, and is hidden from search engines", async ({ page }) => {
    await page.goto("/funnel");
    await expect(page.getByRole("link", { name: "Last 7 days" })).toHaveAttribute("aria-current", "page");
    await page.getByRole("link", { name: "Last 30 days" }).click();
    await expect(page).toHaveURL(/range=30/);
    await expect(page.getByRole("link", { name: "Last 30 days" })).toHaveAttribute("aria-current", "page");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});
