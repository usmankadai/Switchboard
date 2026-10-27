import { describe, expect, it } from "vitest";
import { scrubBreadcrumb, scrubEvent, scrubText, stripQuery } from "./scrub";

describe("scrubText", () => {
  it.each([
    ["Lookup failed for SW1A 1AA", "Lookup failed for [postcode]"],
    ["Lookup failed for sw1a1aa", "Lookup failed for [postcode]"],
    ["No match: M1 1AE, B33 8TH", "No match: [postcode], [postcode]"],
    ["Sent to sam.taylor@example.co.uk", "Sent to [email]"],
  ])("cleans %j", (input, expected) => {
    expect(scrubText(input)).toBe(expected);
  });

  it("leaves ordinary text alone", () => {
    expect(scrubText("octopus unit rates returned 503")).toBe("octopus unit rates returned 503");
  });
});

describe("stripQuery", () => {
  it("removes query strings and fragments", () => {
    expect(stripQuery('/api/graphql?variables={"postcode":"SW1A 1AA"}')).toBe("/api/graphql");
    expect(stripQuery("/usage#annual-kwh")).toBe("/usage");
  });
});

describe("scrubEvent", () => {
  const event = {
    message: "Could not find SW1A 1AA",
    user: { email: "sam@example.com", ip_address: "1.2.3.4" },
    request: {
      url: "https://switchboard.example/api/graphql?operationName=RegionLookup&variables=%7B%7D",
      method: "POST",
      data: { variables: { postcode: "SW1A 1AA", fullName: "Sam Taylor" } },
      query_string: "variables=...",
      cookies: { a: "b" },
      headers: { cookie: "a=b" },
    },
    exception: {
      values: [{ type: "Error", value: "Invalid email sam@example.com" }],
    },
    extra: { nested: { deeper: ["postcode M1 1AE"] } },
  };

  const scrubbed = scrubEvent(event);

  it("drops user details and request bodies, queries, cookies and headers", () => {
    expect(scrubbed).not.toHaveProperty("user");
    expect(scrubbed.request).toEqual({
      url: "https://switchboard.example/api/graphql",
      method: "POST",
    });
  });

  it("cleans every string, however deeply nested", () => {
    const text = JSON.stringify(scrubbed);
    expect(text).not.toMatch(/SW1A|M1 1AE|sam@example\.com|Sam Taylor/);
    expect(scrubbed.message).toBe("Could not find [postcode]");
    expect(scrubbed.exception.values[0]?.value).toBe("Invalid email [email]");
  });

  it("does not change the original event", () => {
    expect(event.user.email).toBe("sam@example.com");
  });
});

describe("scrubBreadcrumb", () => {
  it("drops console breadcrumbs", () => {
    expect(scrubBreadcrumb({ category: "console", message: "anything" })).toBeNull();
  });

  it("strips query strings from fetch breadcrumbs", () => {
    expect(
      scrubBreadcrumb({
        category: "fetch",
        data: { url: "/api/graphql?variables=%7B%22postcode%22%3A%22SW1A1AA%22%7D", method: "GET" },
      }),
    ).toEqual({ category: "fetch", data: { url: "/api/graphql", method: "GET" } });
  });
});
