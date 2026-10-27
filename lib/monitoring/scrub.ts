/**
 * Removes personal data from monitoring events before they leave the app.
 * Used as Sentry's beforeSend, beforeSendTransaction and beforeBreadcrumb.
 *
 * Belt and braces: the app already avoids putting personal data in errors,
 * URLs and logs. This catches anything that slips through, such as a
 * library error message that quotes a value.
 */

const EMAIL = /[^\s@"'<>()[\],;:]+@[^\s@"'<>()[\],;:]+\.[a-z]{2,}/gi;
/** UK postcodes, with or without the space. */
const POSTCODE = /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/gi;

/** Request parts that can carry form values or GraphQL variables. */
const REQUEST_KEYS_TO_DROP = ["data", "cookies", "query_string", "headers", "env"];

const MAX_DEPTH = 12;

export function scrubText(text: string): string {
  return text.replace(EMAIL, "[email]").replace(POSTCODE, "[postcode]");
}

/** "https://x/api/graphql?variables=..." → "https://x/api/graphql" */
export function stripQuery(url: string): string {
  return url.split(/[?#]/)[0] ?? url;
}

function scrubDeep(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[removed]";
  if (typeof value === "string") return scrubText(value);
  if (Array.isArray(value)) return value.map((item) => scrubDeep(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [
        key,
        key === "url" && typeof inner === "string"
          ? scrubText(stripQuery(inner))
          : scrubDeep(inner, depth + 1),
      ]),
    );
  }
  return value;
}

type Scrubbable = Record<string, unknown>;

/** For errors and transactions. Returns a cleaned copy. */
export function scrubEvent<T extends object>(event: T): T {
  const copy: Scrubbable = { ...(event as Scrubbable) };

  // We never identify users, so drop anything about them.
  delete copy.user;

  if (copy.request && typeof copy.request === "object") {
    const request = { ...(copy.request as Scrubbable) };
    for (const key of REQUEST_KEYS_TO_DROP) delete request[key];
    copy.request = request;
  }

  return scrubDeep(copy) as T;
}

/** For breadcrumbs (clicks, navigations, fetches, console lines). */
export function scrubBreadcrumb<T extends object>(breadcrumb: T): T | null {
  // Console output can include anything; it is not worth the risk.
  if ((breadcrumb as Scrubbable).category === "console") return null;
  return scrubDeep(breadcrumb) as T;
}
