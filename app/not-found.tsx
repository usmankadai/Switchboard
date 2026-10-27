import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="container" style={{ paddingTop: "var(--space-5)" }}>
      <h1>Page not found</h1>
      <p>If you typed the web address, check it is correct.</p>
      <p>
        <Link href="/">Go to the start</Link> to compare tariffs.
      </p>
    </div>
  );
}
