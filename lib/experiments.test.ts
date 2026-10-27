import { describe, expect, it } from "vitest";
import { assignTariffLayout, decideTariffLayout, isTariffLayout } from "./experiments";

describe("tariff layout experiment", () => {
  it("splits visitors 50/50", () => {
    expect(assignTariffLayout(() => 0.1)).toBe("cards");
    expect(assignTariffLayout(() => 0.49)).toBe("cards");
    expect(assignTariffLayout(() => 0.5)).toBe("table");
    expect(assignTariffLayout(() => 0.99)).toBe("table");
  });

  it("gives roughly half and half over many visitors", () => {
    let seed = 42;
    // A small deterministic pseudo-random sequence, so the test is stable.
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const tables = Array.from({ length: 10_000 }, () => assignTariffLayout(random)).filter(
      (layout) => layout === "table",
    ).length;
    expect(tables).toBeGreaterThan(4800);
    expect(tables).toBeLessThan(5200);
  });

  it("keeps a visitor in the group they were put in", () => {
    expect(decideTariffLayout("table", undefined, () => 0.1)).toEqual({ layout: "table", isNew: false });
    expect(decideTariffLayout("cards", "on", () => 0.9)).toEqual({ layout: "cards", isNew: false });
  });

  it("assigns new visitors, and visitors with a tampered cookie", () => {
    expect(decideTariffLayout(undefined, undefined, () => 0.9)).toEqual({ layout: "table", isNew: true });
    expect(decideTariffLayout("<script>", undefined, () => 0.1)).toEqual({ layout: "cards", isNew: true });
  });

  it("sends everyone to the control, setting nothing, when switched off", () => {
    expect(decideTariffLayout("table", "off", () => 0.9)).toEqual({ layout: "cards", isNew: false });
    expect(decideTariffLayout(undefined, "off", () => 0.9)).toEqual({ layout: "cards", isNew: false });
  });

  it("recognises only the two layouts", () => {
    expect(isTariffLayout("table")).toBe(true);
    expect(isTariffLayout("grid")).toBe(false);
  });
});
