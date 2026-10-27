import type { Metadata } from "next";
import { ConfirmationStep } from "./ConfirmationStep";

export const metadata: Metadata = { title: "Switch request received" };

export default function ConfirmationPage() {
  return <ConfirmationStep />;
}
