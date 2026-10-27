/**
 * The tariff layout experiment: do more people choose a tariff from cards
 * (the control) or from a comparison table? See ADR 3.
 *
 * Assignment happens in proxy.ts before the page renders. The cookie holds
 * only the layout name, which half of all visitors share, so it identifies
 * nobody.
 */

export const TARIFF_LAYOUTS = ["cards", "table"] as const;
export type TariffLayout = (typeof TARIFF_LAYOUTS)[number];

/** The control: what everyone sees when the experiment is off. */
export const CONTROL_LAYOUT: TariffLayout = "cards";

export const TARIFF_LAYOUT_COOKIE = "sb-tariff-layout";

/** Long enough to keep a visitor in one group for the whole experiment. */
export const TARIFF_LAYOUT_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

export function isTariffLayout(value: unknown): value is TariffLayout {
  return (TARIFF_LAYOUTS as readonly unknown[]).includes(value);
}

/** 50/50. `random` returns a number in [0, 1), like Math.random. */
export function assignTariffLayout(random: () => number = Math.random): TariffLayout {
  return random() < 0.5 ? "cards" : "table";
}

export type LayoutDecision = {
  layout: TariffLayout;
  /** True when this visitor has just been put into a group (set the cookie). */
  isNew: boolean;
};

/**
 * Which layout a visitor sees. Keeps an existing assignment; otherwise
 * assigns one. With the experiment off, everyone sees the control and no
 * cookie is set.
 */
export function decideTariffLayout(
  cookieValue: string | undefined,
  experimentSetting: string | undefined,
  random: () => number = Math.random,
): LayoutDecision {
  if (experimentSetting === "off") return { layout: CONTROL_LAYOUT, isNew: false };
  if (isTariffLayout(cookieValue)) return { layout: cookieValue, isNew: false };
  return { layout: assignTariffLayout(random), isNew: true };
}
