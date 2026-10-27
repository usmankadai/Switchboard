import type { Metadata } from "next";
import { SignupStep } from "./SignupStep";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return <SignupStep />;
}
