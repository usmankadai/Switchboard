/**
 * Typical domestic electricity use across a day, in 48 half-hour slots from
 * 00:00 UK local time. Values are relative weights, not kWh.
 *
 * The shape approximates the published Elexon Profile Class 1 (domestic,
 * unrestricted) average: low overnight, a morning bump, and an evening peak.
 * It is used only to weight variable prices, so the shape matters more than
 * the exact numbers.
 */
export const DOMESTIC_PROFILE: readonly number[] = [
  0.75, 0.68, 0.62, 0.58, 0.55, 0.54, 0.53, 0.53, // 00:00 to 03:30
  0.54, 0.56, 0.6, 0.68, 0.8, 0.95, 1.05, 1.1, // 04:00 to 07:30
  1.08, 1.04, 1.0, 0.98, 0.97, 0.97, 0.98, 1.0, // 08:00 to 11:30
  1.02, 1.0, 0.97, 0.95, 0.94, 0.95, 0.99, 1.08, // 12:00 to 15:30
  1.22, 1.42, 1.6, 1.72, 1.75, 1.7, 1.62, 1.52, // 16:00 to 19:30
  1.45, 1.38, 1.3, 1.2, 1.08, 0.96, 0.88, 0.8, // 20:00 to 23:30
];

const londonTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * Which half-hour slot (0 to 47) an instant falls in, in UK local time.
 * Prices from the API are in UTC, but people use energy by the clock on
 * the wall, so the profile has to be matched in local time.
 */
export function londonSlotIndex(instant: Date): number {
  const parts = londonTime.formatToParts(instant);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  return hour * 2 + (minute >= 30 ? 1 : 0);
}
