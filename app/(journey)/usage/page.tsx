import type { Metadata } from "next";
import { UsageStep } from "./UsageStep";

export const metadata: Metadata = { title: "Your usage" };

export default function UsagePage() {
  return <UsageStep />;
}
