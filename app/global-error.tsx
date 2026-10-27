"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/monitoring/reportError";
import "./globals.css";

/**
 * Last resort, when the root layout itself fails. It replaces the whole
 * document, so it brings its own html, body and styles.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <html lang="en-GB">
      <body>
        <title>Something went wrong | Switchboard</title>
        <main className="container" style={{ paddingTop: "var(--space-5)" }}>
          <h1>Sorry, something went wrong</h1>
          <p>Please try again. If it keeps happening, come back a little later.</p>
          <button type="button" onClick={() => retry()}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
