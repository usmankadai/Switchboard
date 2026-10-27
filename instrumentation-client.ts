/**
 * Browser monitoring. Sentry's client SDK is large (about 137 KB compressed),
 * so it is loaded with a dynamic import, only when a DSN is configured, after
 * the page has started. When NEXT_PUBLIC_SENTRY_DSN is unset the import is
 * removed at build time and visitors download none of it.
 *
 * Trade-off: an error in the first moments of a page load, before Sentry has
 * loaded, can be missed. Server errors are always captured (instrumentation.ts).
 */
type SentryModule = typeof import("@sentry/nextjs");

let sentry: SentryModule | undefined;

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  void Promise.all([import("@sentry/nextjs"), import("@/lib/monitoring/sentryOptions")])
    .then(([Sentry, { sentryOptions }]) => {
      Sentry.init(sentryOptions());
      sentry = Sentry;
    })
    .catch(() => undefined);
}

/** Links client-side navigations to performance traces, once Sentry has loaded. */
export function onRouterTransitionStart(
  ...args: Parameters<SentryModule["captureRouterTransitionStart"]>
) {
  sentry?.captureRouterTransitionStart(...args);
}
