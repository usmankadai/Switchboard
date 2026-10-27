import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";

const request = (cookie?: string, url = "https://switchboard.example/tariffs") =>
  new NextRequest(url, { headers: cookie ? { cookie } : {} });

/** Where Next.js will render the request, as set by NextResponse.rewrite. */
const rewrittenTo = (response: Response) =>
  new URL(response.headers.get("x-middleware-rewrite") ?? "").pathname;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("proxy: tariff layout experiment", () => {
  it("puts a new visitor in a group, remembers it, and rewrites to that layout", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.75);
    const response = proxy(request());

    expect(rewrittenTo(response)).toBe("/tariffs/table");
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/^sb-tariff-layout=table;/);
    expect(cookie).toMatch(/Max-Age=2592000/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toMatch(/Secure/);
  });

  it("keeps a returning visitor's layout without setting the cookie again", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.75);
    const response = proxy(request("sb-tariff-layout=cards"));
    expect(rewrittenTo(response)).toBe("/tariffs/cards");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("keeps the query string when rewriting", () => {
    const response = proxy(request("sb-tariff-layout=cards", "https://switchboard.example/tariffs?from=email"));
    expect(new URL(response.headers.get("x-middleware-rewrite")!).search).toBe("?from=email");
  });

  it("sends everyone to the cards when the experiment is switched off", () => {
    vi.stubEnv("TARIFF_LAYOUT_EXPERIMENT", "off");
    const response = proxy(request("sb-tariff-layout=table"));
    expect(rewrittenTo(response)).toBe("/tariffs/cards");
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
