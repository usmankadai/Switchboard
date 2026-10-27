import type { BrowserOptions } from "@sentry/nextjs";
import { scrubBreadcrumb, scrubEvent } from "./scrub";

/**
 * Shared Sentry settings for the browser and the server. Monitoring is off
 * unless NEXT_PUBLIC_SENTRY_DSN is set, so local runs and tests send nothing.
 */
export function sentryOptions(): BrowserOptions {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  return {
    dsn,
    enabled: Boolean(dsn),
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    // Sentry 11 collects all of these by default, including request bodies and
    // GraphQL variables, which would capture postcodes, names and emails.
    // Turn every category off; the scrubber below is a second layer.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      // The query text is fine (no values); the variables are not.
      graphQL: { document: true, variables: false },
      genAI: { inputs: false, outputs: false },
    },
    // A sample of requests is enough to see slow spots without much cost.
    tracesSampleRate: 0.1,
    beforeSend: (event) => scrubEvent(event),
    beforeSendTransaction: (event) => scrubEvent(event),
    beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
  };
}
