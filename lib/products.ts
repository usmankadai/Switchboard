export type ProductSummary = {
  code: string;
  displayName: string;
  direction: "IMPORT" | "EXPORT";
  isVariable: boolean;
  isTracker: boolean;
  isPrepay: boolean;
  isBusiness: boolean;
  isRestricted: boolean;
  /** Contract length in months, or null for no fixed term. */
  term: number | null;
  availableFrom: string;
  availableTo: string | null;
};

export type TariffKind = "FLEXIBLE" | "FIXED" | "TRACKER" | "AGILE";

export type ComparisonProduct = { kind: TariffKind; product: ProductSummary };

/** Display order in the comparison. */
export const TARIFF_KINDS: readonly TariffKind[] = [
  "FLEXIBLE",
  "FIXED",
  "TRACKER",
  "AGILE",
];

/**
 * How to recognise each tariff type in the product list. Product codes
 * change when tariffs are relaunched, so match on stable prefixes and flags
 * rather than exact codes.
 */
const MATCHERS: Record<TariffKind, (product: ProductSummary) => boolean> = {
  FLEXIBLE: (p) => p.isVariable && p.code.startsWith("VAR-"),
  // The plain 12 month fix. Go, Cosy and Intelligent fixes need special meters.
  FIXED: (p) => !p.isVariable && p.code.startsWith("OE-FIX-12M-"),
  TRACKER: (p) => p.isTracker,
  AGILE: (p) => p.code.startsWith("AGILE-"),
};

function isOnSaleToHomes(product: ProductSummary, at: Date): boolean {
  const time = at.getTime();
  return (
    product.direction === "IMPORT" &&
    !product.isPrepay &&
    !product.isBusiness &&
    !product.isRestricted &&
    Date.parse(product.availableFrom) <= time &&
    (product.availableTo === null || time < Date.parse(product.availableTo))
  );
}

/**
 * Choose one product per tariff type for the comparison: the newest one on
 * sale. A type with nothing on sale (Tracker is sometimes closed to new
 * customers) is left out rather than shown with stale prices.
 */
export function selectComparisonProducts(
  products: readonly ProductSummary[],
  at: Date,
): ComparisonProduct[] {
  const onSale = products.filter((product) => isOnSaleToHomes(product, at));

  return TARIFF_KINDS.flatMap((kind) => {
    const newest = onSale
      .filter(MATCHERS[kind])
      .sort(
        (a, b) => Date.parse(b.availableFrom) - Date.parse(a.availableFrom),
      )[0];
    return newest ? [{ kind, product: newest }] : [];
  });
}
