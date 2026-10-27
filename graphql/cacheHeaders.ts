/**
 * Apollo Server's cache control plugin sets `Cache-Control: max-age=N, public`
 * on cacheable GET responses (never on mutations, errors or partial results).
 * That header is for browsers. CDNs such as Vercel's read `CDN-Cache-Control`,
 * so we derive one that also serves stale data while refreshing in the
 * background: a traffic spike is then answered from the edge.
 */
const MAX_STALE_SECONDS = 7 * 24 * 60 * 60;

export function cdnCacheControl(browserCacheControl: string | null): string | null {
  if (!browserCacheControl || !/\bpublic\b/.test(browserCacheControl)) return null;
  const maxAge = Number(/\bmax-age=(\d+)/.exec(browserCacheControl)?.[1] ?? 0);
  if (maxAge <= 0) return null;
  const stale = Math.min(maxAge * 12, MAX_STALE_SECONDS);
  return `public, s-maxage=${maxAge}, stale-while-revalidate=${stale}`;
}
