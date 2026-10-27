import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearJourney,
  JOURNEY_STORAGE_KEY,
  loadJourney,
  saveJourney,
  sanitiseJourney,
  subscribeToJourney,
} from "./journey-storage";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("journey storage", () => {
  it("saves and loads answers, merging each step", () => {
    saveJourney({ regionCode: "C" });
    saveJourney({ annualKwh: 2700 });
    expect(loadJourney()).toEqual({ regionCode: "C", annualKwh: 2700 });
  });

  it("never stores fields outside the allow-list, such as a postcode", () => {
    saveJourney({ regionCode: "C", postcode: "SW1A 1AA", email: "a@b.com" } as never);
    const stored = window.localStorage.getItem(JOURNEY_STORAGE_KEY) ?? "";
    expect(stored).not.toContain("SW1A");
    expect(stored).not.toContain("@");
  });

  it("ignores corrupt or tampered data", () => {
    window.localStorage.setItem(JOURNEY_STORAGE_KEY, "{not json");
    expect(loadJourney()).toEqual({});

    expect(sanitiseJourney({ regionCode: "Z", annualKwh: -1, tariffId: 7 })).toEqual({});
  });

  it("keeps working when storage throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(saveJourney({ regionCode: "C" })).toBe(false);
  });

  it("clears everything", () => {
    saveJourney({ regionCode: "C" });
    clearJourney();
    expect(loadJourney()).toEqual({});
  });

  it("tells subscribers when the journey changes", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToJourney(onChange);
    saveJourney({ regionCode: "C" });
    unsubscribe();
    saveJourney({ regionCode: "A" });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
