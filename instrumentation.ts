import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/monitoring/sentryOptions";

const enabled = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);

/** Runs once when a server instance starts. Does nothing when monitoring is off. */
export function register() {
  if (enabled) Sentry.init(sentryOptions());
}

/** Reports errors from Server Components, route handlers and server actions. */
export const onRequestError: typeof Sentry.captureRequestError = (...args) => {
  if (enabled) return Sentry.captureRequestError(...args);
};
