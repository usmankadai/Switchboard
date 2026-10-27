/** The quote journey, in order. Used for "Step x of y" and links between steps. */
export const JOURNEY_STEPS = [
  { path: "/postcode", title: "Your postcode" },
  { path: "/usage", title: "Your usage" },
  { path: "/tariffs", title: "Compare tariffs" },
  { path: "/signup", title: "Sign up" },
] as const;

export type StepPath = (typeof JOURNEY_STEPS)[number]["path"];

export function stepCaption(path: StepPath): string {
  const index = JOURNEY_STEPS.findIndex((step) => step.path === path);
  return `Step ${index + 1} of ${JOURNEY_STEPS.length}`;
}
