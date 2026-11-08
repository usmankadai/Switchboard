import { expect, test } from "./fixtures";

/** Reads a tag's attribute from <head>, or null when the tag is missing. */
async function headAttribute(page: import("@playwright/test").Page, selector: string, attribute: string) {
  return page.locator(`head ${selector}`).first().getAttribute(attribute);
}

test.describe("icons and link preview", () => {
  // Only <head> and image files are checked, so one browser is enough.
  test.skip(({ isMobile }) => isMobile, "Desktop only");

  test("the browser tab icons are Switchboard's own", async ({ page, request }) => {
    await page.goto("/");

    const svgIcon = await headAttribute(page, 'link[rel="icon"][type="image/svg+xml"]', "href");
    const appleIcon = await headAttribute(page, 'link[rel="apple-touch-icon"]', "href");
    expect(svgIcon).toMatch(/^\/icon\.svg/);
    expect(appleIcon).toMatch(/^\/apple-icon/);

    for (const [path, type] of [
      [svgIcon!, "image/svg+xml"],
      [appleIcon!, "image/png"],
      ["/favicon.ico", "image/x-icon"],
    ] as const) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      expect(response.headers()["content-type"], path).toContain(type);
    }
  });

  test("shared links get a full-size preview image with alt text", async ({ page, request }) => {
    await page.goto("/postcode");

    const image = await headAttribute(page, 'meta[property="og:image"]', "content");
    // Must be a full URL: LinkedIn and others ignore relative ones.
    expect(image).toMatch(/^https?:\/\/[^/]+\/opengraph-image/);
    expect(await headAttribute(page, 'meta[property="og:image:width"]', "content")).toBe("1200");
    expect(await headAttribute(page, 'meta[property="og:image:height"]', "content")).toBe("630");
    expect(await headAttribute(page, 'meta[property="og:image:alt"]', "content")).toMatch(
      /not affiliated with Octopus Energy/i,
    );
    expect(await headAttribute(page, 'meta[property="og:site_name"]', "content")).toBe("Switchboard");
    expect(await headAttribute(page, 'meta[name="twitter:card"]', "content")).toBe("summary_large_image");

    // The host depends on where the site runs, so fetch the path from this server.
    const response = await request.get(new URL(image!).pathname + new URL(image!).search);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
  });
});
