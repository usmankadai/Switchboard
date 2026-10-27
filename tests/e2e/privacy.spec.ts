import { expect, test } from "./fixtures";
import { comparisonReply, mockGraphQL, regionReply } from "./graphqlMock";

/**
 * Privacy rules that are easy to break by accident: personal data must never
 * appear in a URL, and funnel events must stay anonymous.
 */
test.describe("privacy", () => {
  test.skip(({ isMobile }) => isMobile, "Network rules do not depend on the device");

  test("sends the postcode by POST and only the comparison by GET", async ({ page }) => {
    await mockGraphQL(page, {
      RegionLookup: regionReply("C", "London"),
      TariffComparison: comparisonReply,
    });
    const graphqlRequests: { method: string; url: string; operation: string | null }[] = [];
    page.on("request", (request) => {
      if (!request.url().includes("/api/graphql")) return;
      const url = new URL(request.url());
      graphqlRequests.push({
        method: request.method(),
        url: request.url(),
        operation:
          url.searchParams.get("operationName") ??
          (request.postDataJSON() as { operationName?: string } | null)?.operationName ??
          null,
      });
    });

    await page.goto("/postcode");
    await page.getByRole("textbox", { name: "What is your postcode?" }).fill("SW1A 1AA");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("radio", { name: /yes, i will enter it/i }).check();
    await page.getByRole("textbox", { name: /yearly electricity use/i }).fill("2700");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("list", { name: "Tariffs" })).toBeVisible();

    const lookup = graphqlRequests.find((request) => request.operation === "RegionLookup");
    const comparison = graphqlRequests.find((request) => request.operation === "TariffComparison");
    expect(lookup?.method).toBe("POST");
    expect(comparison?.method).toBe("GET");
    for (const request of graphqlRequests) {
      expect(decodeURIComponent(request.url)).not.toMatch(/SW1A/i);
    }
  });

  test("funnel events contain only allow-listed values", async ({ page }) => {
    await mockGraphQL(page, { RegionLookup: regionReply("C", "London") });
    const events: Record<string, unknown>[] = [];
    await page.route("**/api/events", async (route) => {
      events.push(route.request().postDataJSON() as Record<string, unknown>);
      await route.fulfill({ status: 204 });
    });

    await page.goto("/postcode");
    await page.getByRole("textbox", { name: "What is your postcode?" }).fill("SW1A 1AA");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/usage$/);

    await expect.poll(() => events.length).toBeGreaterThanOrEqual(3);
    expect(events.map(({ step, action }) => `${step} ${action}`)).toEqual(
      expect.arrayContaining(["postcode viewed", "postcode completed", "usage viewed"]),
    );
    for (const event of events) {
      expect(Object.keys(event).sort()).toEqual(["action", "sessionId", "step"]);
      expect(JSON.stringify(event)).not.toMatch(/SW1A/i);
    }
  });

  test("the events endpoint rejects anything outside the allow-list", async ({ request }) => {
    const ok = await request.post("/api/events", {
      data: { sessionId: "3f9a1c2e-1234-4abc-8def-0123456789ab", step: "usage", action: "viewed" },
    });
    expect(ok.status()).toBe(204);

    const withEmail = await request.post("/api/events", {
      data: {
        sessionId: "3f9a1c2e-1234-4abc-8def-0123456789ab",
        step: "usage",
        action: "viewed",
        email: "sam@example.com",
      },
    });
    expect(withEmail.status()).toBe(400);
  });
});

test.describe("error pages", () => {
  test("an unknown address shows a helpful not found page", async ({ page }) => {
    const response = await page.goto("/no-such-page");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to the start" })).toBeVisible();
  });
});
