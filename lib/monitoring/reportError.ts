/**
 * Report an error from the browser. Sentry is loaded on demand and only when
 * monitoring is configured, so visitors do not download it otherwise.
 */
export function reportError(error: unknown): void {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  void import("@sentry/nextjs")
    .then((Sentry) => Sentry.captureException(error))
    .catch(() => undefined);
}
