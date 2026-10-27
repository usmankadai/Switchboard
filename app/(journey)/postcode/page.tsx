import type { Metadata } from "next";
import { PostcodeForm } from "./PostcodeForm";

export const metadata: Metadata = { title: "Your postcode" };

export default function PostcodePage() {
  return <PostcodeForm />;
}
