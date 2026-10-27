"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  parseJourney,
  readJourneyRaw,
  subscribeToJourney,
  type SavedJourney,
} from "@/lib/journey-storage";

/**
 * The saved journey, kept in sync with storage.
 *
 * Returns `null` during server rendering and hydration (storage is not
 * available there), so callers can tell "not loaded yet" from "nothing saved".
 */
export function useSavedJourney(): SavedJourney | null {
  const raw = useSyncExternalStore(
    subscribeToJourney,
    // An empty string means "loaded, nothing saved", distinct from null.
    () => readJourneyRaw() ?? "",
    () => null,
  );
  return useMemo(() => (raw === null ? null : parseJourney(raw)), [raw]);
}
