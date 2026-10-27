/**
 * Anonymous journey funnel events: which steps people see and complete, so
 * we can see where they drop off. "Abandoned" is worked out later from a
 * step viewed but never completed, so it is not sent.
 *
 * Privacy by construction: the allow-lists below are the only values that
 * can be sent. There is no free text, so no personal data can get in. The
 * session id is random, lives in sessionStorage for one tab, and is not
 * linked to anything else.
 */

export const FUNNEL_STEPS = ["postcode", "usage", "tariffs", "signup", "confirmation"] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number];

export const FUNNEL_ACTIONS = ["viewed", "completed"] as const;
export type FunnelAction = (typeof FUNNEL_ACTIONS)[number];

/** Optional, non-personal detail about how a step was completed. */
export const FUNNEL_DETAILS = [
  "usage-known",
  "usage-estimate",
  "tariff-flexible",
  "tariff-fixed",
  "tariff-tracker",
  "tariff-agile",
] as const;
export type FunnelDetail = (typeof FUNNEL_DETAILS)[number];

export type FunnelEvent = {
  sessionId: string;
  step: FunnelStep;
  action: FunnelAction;
  detail?: FunnelDetail;
};

const SESSION_ID = /^[0-9a-f-]{36}$/;

/** Strictly check an incoming event. Anything unexpected is rejected, not cleaned. */
export function parseFunnelEvent(value: unknown): FunnelEvent | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  const allowedKeys = new Set(["sessionId", "step", "action", "detail"]);
  if (Object.keys(raw).some((key) => !allowedKeys.has(key))) return null;

  if (typeof raw.sessionId !== "string" || !SESSION_ID.test(raw.sessionId)) return null;
  if (!(FUNNEL_STEPS as readonly unknown[]).includes(raw.step)) return null;
  if (!(FUNNEL_ACTIONS as readonly unknown[]).includes(raw.action)) return null;
  if (raw.detail !== undefined && !(FUNNEL_DETAILS as readonly unknown[]).includes(raw.detail)) {
    return null;
  }

  return {
    sessionId: raw.sessionId,
    step: raw.step as FunnelStep,
    action: raw.action as FunnelAction,
    ...(raw.detail ? { detail: raw.detail as FunnelDetail } : {}),
  };
}

const SESSION_KEY = "switchboard:funnel-session";

function sessionId(): string | null {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing && SESSION_ID.test(existing)) return existing;
    const created = crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    // Storage blocked: skip analytics rather than track without a session.
    return null;
  }
}

/**
 * Send one event. Fire and forget: it never throws and never blocks the
 * journey. Uses sendBeacon so it survives the page changing.
 */
export function trackFunnel(step: FunnelStep, action: FunnelAction, detail?: FunnelDetail): void {
  if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") return;
  const id = sessionId();
  if (!id) return;

  const event: FunnelEvent = { sessionId: id, step, action, ...(detail ? { detail } : {}) };
  try {
    navigator.sendBeacon(
      "/api/events",
      new Blob([JSON.stringify(event)], { type: "application/json" }),
    );
  } catch {
    // Analytics must never break the journey.
  }
}
