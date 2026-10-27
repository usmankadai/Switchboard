import { describe, expect, it } from "vitest";
import { selectComparisonProducts, type ProductSummary } from "./products";

const now = new Date("2026-10-27T12:00:00Z");

const product = (
  code: string,
  overrides: Partial<ProductSummary> = {},
): ProductSummary => ({
  code,
  displayName: code,
  direction: "IMPORT",
  isVariable: true,
  isTracker: false,
  isPrepay: false,
  isBusiness: false,
  isRestricted: false,
  term: null,
  availableFrom: "2024-01-01T00:00:00Z",
  availableTo: null,
  ...overrides,
});

// Shaped like the live product list on 27 October 2026.
const liveList: ProductSummary[] = [
  product("AGILE-24-10-01", { term: 12 }),
  product("AGILE-OUTGOING-19-05-13", { direction: "EXPORT" }),
  product("COSY-FIX-12M-26-10-14", { isVariable: false, term: 12 }),
  product("GO-FIX-12M-26-10-14", { isVariable: false, term: 12 }),
  product("OE-FIX-12M-26-10-20", { isVariable: false, term: 12, availableFrom: "2026-10-20T00:00:00Z" }),
  product("OE-FIX-12M-26-10-27", { isVariable: false, term: 12, availableFrom: "2026-10-27T00:00:00Z" }),
  product("OE-FIX-18M-26-10-27", { isVariable: false, term: 18 }),
  product("PREPAY-VAR-18-09-21", { isPrepay: true }),
  product("VAR-22-11-01"),
];

describe("selectComparisonProducts", () => {
  it("picks one product per type, in display order", () => {
    const selected = selectComparisonProducts(liveList, now);
    expect(selected.map(({ kind, product }) => [kind, product.code])).toEqual([
      ["FLEXIBLE", "VAR-22-11-01"],
      ["FIXED", "OE-FIX-12M-26-10-27"],
      ["AGILE", "AGILE-24-10-01"],
    ]);
  });

  it("leaves Tracker out when it is closed to new customers", () => {
    const kinds = selectComparisonProducts(liveList, now).map((p) => p.kind);
    expect(kinds).not.toContain("TRACKER");
  });

  it("includes Tracker when one is on sale", () => {
    const list = [...liveList, product("SILVER-25-04-15", { isTracker: true })];
    const tracker = selectComparisonProducts(list, now).find(
      (p) => p.kind === "TRACKER",
    );
    expect(tracker?.product.code).toBe("SILVER-25-04-15");
  });

  it("skips products that are not on sale yet or have been withdrawn", () => {
    const list = [
      product("VAR-22-11-01", { availableTo: "2026-10-01T00:00:00Z" }),
      product("AGILE-26-11-01", { availableFrom: "2026-11-01T00:00:00Z" }),
    ];
    expect(selectComparisonProducts(list, now)).toEqual([]);
  });

  it("skips prepay, business, restricted and export products", () => {
    const list = [
      product("VAR-1", { isPrepay: true }),
      product("VAR-2", { isBusiness: true }),
      product("VAR-3", { isRestricted: true }),
      product("AGILE-X", { direction: "EXPORT" }),
    ];
    expect(selectComparisonProducts(list, now)).toEqual([]);
  });
});
