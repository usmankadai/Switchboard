/**
 * Required on the landing page and in the footer (see CLAUDE.md branding rule).
 * Keep the wording exactly as it is.
 */
export const INDEPENDENCE_NOTICE =
  "Independent concept. Tariff data from the public Octopus Energy API. Not affiliated with Octopus Energy.";

export function IndependenceNotice({ className }: { className?: string }) {
  return <p className={className}>{INDEPENDENCE_NOTICE}</p>;
}
