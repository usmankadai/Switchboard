type SiteEnv = Readonly<Record<string, string | undefined>>;

/**
 * The site's public address, used to turn the link preview image into a
 * full URL (LinkedIn and others ignore relative ones).
 *
 * 1. NEXT_PUBLIC_SITE_URL, when set (for example a custom domain).
 * 2. On Vercel production, the project's production domain, so shared links
 *    never point at a single deployment's address.
 * 3. On other Vercel deployments, that deployment's address.
 * 4. Otherwise, the local dev server.
 */
export function siteUrl(env: SiteEnv = process.env): URL {
  if (env.NEXT_PUBLIC_SITE_URL) return new URL(env.NEXT_PUBLIC_SITE_URL);
  const host =
    env.VERCEL_ENV === "production" && env.VERCEL_PROJECT_PRODUCTION_URL
      ? env.VERCEL_PROJECT_PRODUCTION_URL
      : env.VERCEL_URL;
  return new URL(host ? `https://${host}` : "http://localhost:3000");
}
