import type { Metadata } from "next";
import { TariffsStep } from "./TariffsStep";

export const metadata: Metadata = { title: "Compare tariffs" };

export default function TariffsPage() {
  return <TariffsStep />;
}
