import { REGION_NAMES } from "./regions";

/**
 * Save and resume for the quote journey.
 *
 * Privacy rule (see CLAUDE.md): only non-personal answers are stored. No
 * names, emails, phone numbers, addresses or full postcodes. The type below
 * is the whole allow-list; anything else found in storage is dropped.
 *
 * Storage can be missing or throw (private browsing, blocked cookies), so
 * every access is wrapped and the journey still works without it.
 */
export type SavedJourney = {
  /** Region letter, for example "C". */
  regionCode?: string;
  annualKwh?: number;
  /** The chosen tariff's id from the comparison. */
  tariffId?: string;
};

/** Bump the version if the shape changes, so old data is ignored, not misread. */
export const JOURNEY_STORAGE_KEY = "switchboard:journey:v1";

const CHANGE_EVENT = "switchboard:journey-change";

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Keep only known, valid fields. */
export function sanitiseJourney(value: unknown): SavedJourney {
  if (typeof value !== "object" || value === null) return {};
  const raw = value as Record<string, unknown>;
  const journey: SavedJourney = {};

  if (typeof raw.regionCode === "string" && raw.regionCode in REGION_NAMES) {
    journey.regionCode = raw.regionCode;
  }
  if (
    typeof raw.annualKwh === "number" &&
    Number.isInteger(raw.annualKwh) &&
    raw.annualKwh > 0
  ) {
    journey.annualKwh = raw.annualKwh;
  }
  if (typeof raw.tariffId === "string" && raw.tariffId.length <= 64) {
    journey.tariffId = raw.tariffId;
  }
  return journey;
}

export function parseJourney(raw: string | null): SavedJourney {
  if (!raw) return {};
  try {
    return sanitiseJourney(JSON.parse(raw));
  } catch {
    return {};
  }
}

/** The raw stored string. Stable between calls, so safe for useSyncExternalStore. */
export function readJourneyRaw(): string | null {
  try {
    return storage()?.getItem(JOURNEY_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

export function loadJourney(): SavedJourney {
  return parseJourney(readJourneyRaw());
}

/** Merge new answers into the saved journey. Returns false if storage is unavailable. */
export function saveJourney(patch: SavedJourney): boolean {
  const store = storage();
  if (!store) return false;
  try {
    const next = sanitiseJourney({ ...loadJourney(), ...patch });
    store.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function clearJourney(): void {
  try {
    storage()?.removeItem(JOURNEY_STORAGE_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Nothing saved, or storage blocked: either way there is nothing to clear.
  }
}

/** Notify on changes in this tab (custom event) and other tabs (storage event). */
export function subscribeToJourney(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === JOURNEY_STORAGE_KEY) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
