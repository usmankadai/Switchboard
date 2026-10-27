"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/Button";
import { reportError } from "@/lib/monitoring/reportError";

/**
 * Shown when a page fails to render. The header and footer still show, so
 * people keep their bearings. Production errors arrive without details (Next
 * hides them), so nothing personal is shown or sent.
 */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <div className="container" style={{ paddingTop: "var(--space-5)" }}>
      <title>Something went wrong | Switchboard</title>
      <h1>Sorry, something went wrong</h1>
      <p>Your answers so far are saved. Try again, or start from the beginning.</p>
      <p style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center" }}>
        <Button onClick={() => retry()}>Try again</Button>
        <Link href="/">Go to the start</Link>
      </p>
    </div>
  );
}
