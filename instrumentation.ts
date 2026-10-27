import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/monitoring/sentryOptions";

/** Runs once when a server instance starts. */
export function register() {
  Sentry.init(sentryOptions());
}

/** Reports errors from Server Components, route handlers and server actions. */
export const onRequestError = Sentry.captureRequestError;
