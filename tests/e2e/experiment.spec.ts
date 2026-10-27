import type { BrowserContext, Page } from "@playwright/test";
import { expect, expectNoAxeViolations, test } from "./fixtures";
import { comparisonReply, mockGraphQL } from "./graphqlMock";

const STORAGE_KEY = "switchboard:journey:v1";
const COOKIE = "sb-tariff-layout";

async function layoutCookie(context: BrowserContext) {
  return (await context.cookies()).find((cookie) => cookie.name === COOKIE);
}

async function openTariffs(page: Page) {
  await mockGraphQL(page, { TariffComparison: comparisonReply });
  await page.goto("/");
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [STORAGE_KEY, JSON.stringify({ regionCode: "C", annualKwh: 2700, usage: { method: "known" } })] as const,
  );
  await page.goto("/tariffs");
}

/** Scroll the table to its end, as a person would swipe, so Choose is on screen. */
async function scrollTableToEnd(page: Page) {
  await page
    .getByRole("region", { name: "Tariffs compared" })
    .evaluate((element) => (element.scrollLeft = element.scrollWidth));
}

async function useLayout(context: BrowserContext, baseURL: string, layout: "cards" | "table") {
  await context.clearCookies({ name: COOKIE });
  await context.addCookies([{ name: COOKIE, value: layout, url: baseURL }]);
}

test.describe("tariff layout A/B test", () => {
  test("puts a new visitor in a group, keeps them there, and keeps the address /tariffs", async ({
    page,
    context,
  }) => {
    await context.clearCookies({ name: COOKIE });
    await openTariffs(page);

    const cookie = await layoutCookie(context);
    expect(cookie?.value).toMatch(/^(cards|table)$/);
    expect(cookie?.httpOnly).toBe(true);
    await expect(page).toHaveURL(/\/tariffs$/);

    // The page matches the group, and still does after a reload.
    const tableShown = () => page.getByRole("table", { name: "Tariffs compared" }).isVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Compare tariffs" })).toBeVisible();
    await page.getByRole("button", { name: /Choose Flexible Octopus/ }).waitFor();
    const first = await tableShown();
    expect(first).toBe(cookie?.value === "table");

    await page.reload();
    await page.getByRole("button", { name: /Choose Flexible Octopus/ }).waitFor();
    expect(await tableShown()).toBe(first);
    expect((await layoutCookie(context))?.value).toBe(cookie?.value);
  });

  test("the comparison table works and has no accessibility violations", async ({
    page,
    context,
    baseURL,
  }) => {
    await useLayout(context, baseURL!, "table");
    await openTariffs(page);

    const table = page.getByRole("table", { name: "Tariffs compared" });
    await expect(table).toBeVisible();
    await expect(table.getByRole("row")).toHaveCount(4); // header + 3 tariffs
    await expect(table.getByRole("rowheader", { name: /Flexible Octopus/ })).toContainText(
      "Lowest estimated cost",
    );
    await expectNoAxeViolations(page);

    // Pressed with the keyboard: on emulated phones Playwright's pointer lands
    // in the wrong place inside a sideways-scrolling box. Real taps work (the
    // button is the element at its own position once scrolled).
    await page.getByRole("button", { name: "Choose Octopus 12M Fixed" }).press("Enter");
    await expect(page).toHaveURL(/\/signup$/);
    const stored = await page.evaluate((key) => localStorage.getItem(key) ?? "", STORAGE_KEY);
    expect(JSON.parse(stored).tariffId).toBe("E-1R-OE-FIX-12M-26-10-27-C");
  });

  test("funnel events report the layout the visitor saw", async ({ page, context, baseURL }) => {
    await useLayout(context, baseURL!, "table");
    const events: Record<string, unknown>[] = [];
    await page.route("**/api/events", async (route) => {
      events.push(route.request().postDataJSON() as Record<string, unknown>);
      await route.fulfill({ status: 204 });
    });
    await openTariffs(page);
    await page.getByRole("button", { name: "Choose Agile Octopus" }).press("Enter");
    await expect(page).toHaveURL(/\/signup$/);

    await expect
      .poll(() => events.filter((event) => event.step === "tariffs").map((event) => `${event.action} ${event.variant}`))
      .toEqual(expect.arrayContaining(["viewed table", "completed table"]));
  });

  test("on a phone, the table scrolls inside its own box, not the page", async ({
    page,
    context,
    baseURL,
    isMobile,
  }) => {
    test.skip(!isMobile, "Phone layout");
    await useLayout(context, baseURL!, "table");
    await openTariffs(page);

    const region = page.getByRole("region", { name: "Tariffs compared" });
    await expect(region).toBeVisible();
    const sizes = await region.evaluate((element) => ({
      regionScrolls: element.scrollWidth > element.clientWidth,
      pageOverflows: document.documentElement.scrollWidth > window.innerWidth,
    }));
    expect(sizes).toEqual({ regionScrolls: true, pageOverflows: false });
    await expect(page.getByText("Scroll the table sideways to see every detail")).toBeVisible();

    // Swipe to the Choose buttons: the tariff name stays in view, and the
    // button is what a tap at its position would hit.
    await scrollTableToEnd(page);
    await expect(page.getByRole("rowheader", { name: /Octopus 12M Fixed/ })).toBeInViewport();
    const button = page.getByRole("button", { name: "Choose Octopus 12M Fixed" });
    await button.scrollIntoViewIfNeeded();
    expect(
      await button.evaluate((element) => {
        const box = element.getBoundingClientRect();
        return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
      }),
    ).toBe(true);
    await expectNoAxeViolations(page);
  });
});

test.describe("experiment results on the dashboard", () => {
  test.skip(({ isMobile }) => isMobile, "One device is enough");

  test("shows each layout's choose rate and a careful verdict", async ({ page, request }) => {
    const send = (sessionId: string, action: string, variant: string) =>
      request.post("/api/events", { data: { sessionId, step: "tariffs", action, variant } });
    const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
    await send(id(901), "viewed", "table");
    await send(id(901), "completed", "table");
    await send(id(902), "viewed", "cards");

    await page.goto("/funnel?range=1");
    const section = page.getByRole("region", { name: "Experiment: tariff layout" });
    await expect(section.getByRole("rowheader", { name: "Cards (control)" })).toBeVisible();
    await expect(section.getByRole("rowheader", { name: "Comparison table" })).toBeVisible();
    // Far too few sessions to call a winner.
    await expect(section.getByText(/Not enough data yet/)).toBeVisible();
    await expectNoAxeViolations(page);
  });
});
