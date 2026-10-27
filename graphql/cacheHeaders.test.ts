import { describe, expect, it } from "vitest";
import { cdnCacheControl } from "./cacheHeaders";

describe("cdnCacheControl", () => {
  it("turns Apollo's public max-age into a CDN header with stale-while-revalidate", () => {
    expect(cdnCacheControl("max-age=300, public")).toBe(
      "public, s-maxage=300, stale-while-revalidate=3600",
    );
  });

  it("caps how long stale data may be served", () => {
    expect(cdnCacheControl("max-age=86400, public")).toBe(
      "public, s-maxage=86400, stale-while-revalidate=604800",
    );
  });

  it.each([null, "no-store", "max-age=300, private", "max-age=0, public"])(
    "adds nothing for %j",
    (header) => {
      expect(cdnCacheControl(header)).toBeNull();
    },
  );
});
