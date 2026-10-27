import { afterEach, describe, expect, it, vi } from "vitest";
import { parseFunnelEvent, trackFunnel } from "./funnel";

const id = "3f9a1c2e-1234-4abc-8def-0123456789ab";

afterEach(() => {
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
});

describe("parseFunnelEvent", () => {
  it("accepts an event made only of allowed values", () => {
    expect(parseFunnelEvent({ sessionId: id, step: "usage", action: "completed", detail: "usage-estimate" })).toEqual({
      sessionId: id,
      step: "usage",
      action: "completed",
      detail: "usage-estimate",
    });
  });

  it.each([
    ["an unknown step", { sessionId: id, step: "payment", action: "viewed" }],
    ["an unknown action", { sessionId: id, step: "usage", action: "clicked" }],
    ["free-text detail", { sessionId: id, step: "usage", action: "viewed", detail: "SW1A 1AA" }],
    ["an extra field", { sessionId: id, step: "usage", action: "viewed", email: "a@b.com" }],
    ["a made-up session id", { sessionId: "sam@example.com", step: "usage", action: "viewed" }],
    ["not an object", "usage viewed"],
    ["an unknown layout", { sessionId: id, step: "tariffs", action: "viewed", variant: "grid" }],
    ["a layout on another step", { sessionId: id, step: "usage", action: "viewed", variant: "table" }],
  ])("rejects %s", (_label, value) => {
    expect(parseFunnelEvent(value)).toBeNull();
  });
});

describe("A/B test layout", () => {
  it("is accepted on the tariffs step", () => {
    expect(parseFunnelEvent({ sessionId: id, step: "tariffs", action: "completed", detail: "tariff-fixed", variant: "table" })).toEqual({
      sessionId: id,
      step: "tariffs",
      action: "completed",
      detail: "tariff-fixed",
      variant: "table",
    });
  });
});

describe("trackFunnel", () => {
  it("does nothing where sendBeacon is not available", () => {
    expect(() => trackFunnel("usage", "viewed")).not.toThrow();
  });

  it("sends a valid event with the same session id each time", async () => {
    const sendBeacon = vi.fn(() => true);
    vi.stubGlobal("navigator", { sendBeacon });

    trackFunnel("postcode", "viewed");
    trackFunnel("postcode", "completed");

    const sent = await Promise.all(
      sendBeacon.mock.calls.map(async (call) => JSON.parse(await (call as unknown as [string, Blob])[1].text())),
    );
    expect(sent.map((event) => parseFunnelEvent(event))).not.toContain(null);
    expect(sent[0].sessionId).toBe(sent[1].sessionId);
    expect(sendBeacon).toHaveBeenCalledWith("/api/events", expect.any(Blob));
  });
});
