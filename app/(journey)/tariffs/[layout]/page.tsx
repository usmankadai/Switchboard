import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isTariffLayout, TARIFF_LAYOUTS } from "@/lib/experiments";
import { TariffsStep } from "../TariffsStep";

export const metadata: Metadata = { title: "Compare tariffs" };

/**
 * One prebuilt page per layout of the A/B test. Visitors reach these through
 * proxy.ts, which rewrites /tariffs here, so the address bar still says
 * /tariffs. Visiting /tariffs/table directly is handy for checking a layout.
 */
export function generateStaticParams() {
  return TARIFF_LAYOUTS.map((layout) => ({ layout }));
}

export default async function TariffLayoutPage({ params }: PageProps<"/tariffs/[layout]">) {
  const { layout } = await params;
  if (!isTariffLayout(layout)) notFound();
  return <TariffsStep layout={layout} />;
}
