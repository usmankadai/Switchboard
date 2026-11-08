import { describe, expect, it } from "vitest";
import { siteUrl } from "./site-url";

describe("siteUrl", () => {
  it("prefers an address set by hand", () => {
    expect(
      siteUrl({ NEXT_PUBLIC_SITE_URL: "https://switchboard.example", VERCEL_URL: "x.vercel.app" }).href,
    ).toBe("https://switchboard.example/");
  });

  it("uses the production domain on Vercel production, not the deployment's address", () => {
    expect(
      siteUrl({
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "switchboard.vercel.app",
        VERCEL_URL: "switchboard-abc123.vercel.app",
      }).href,
    ).toBe("https://switchboard.vercel.app/");
  });

  it("uses the deployment's own address on preview deployments", () => {
    expect(
      siteUrl({
        VERCEL_ENV: "preview",
        VERCEL_PROJECT_PRODUCTION_URL: "switchboard.vercel.app",
        VERCEL_URL: "switchboard-git-branch.vercel.app",
      }).href,
    ).toBe("https://switchboard-git-branch.vercel.app/");
  });

  it("falls back to the local dev server", () => {
    expect(siteUrl({}).href).toBe("http://localhost:3000/");
  });
});
