import { describe, expect, it } from "vitest";
import { recentDaysWindow, todayWindow } from "./windows";

describe("day windows", () => {
  it("gives the same window for any time on the same day", () => {
    expect(todayWindow(new Date("2026-10-27T00:00:01Z"))).toEqual(
      todayWindow(new Date("2026-10-27T23:59:59Z")),
    );
  });

  it("covers today in full", () => {
    expect(todayWindow(new Date("2026-10-27T15:00:00Z"))).toEqual({
      from: "2026-10-27T00:00:00.000Z",
      to: "2026-10-28T00:00:00.000Z",
    });
  });

  it("covers the last complete days, ending at midnight", () => {
    expect(recentDaysWindow(new Date("2026-10-27T15:00:00Z"), 30)).toEqual({
      from: "2026-09-27T00:00:00.000Z",
      to: "2026-10-27T00:00:00.000Z",
    });
  });
});
