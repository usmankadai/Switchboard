import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Link from "next/link";
import { IndependenceNotice } from "@/components/IndependenceNotice";
import { siteUrl } from "@/lib/site-url";
import styles from "./layout.module.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const description =
  "An independent concept for a simple, accessible energy switching journey, using real tariff prices from the public Octopus Energy API.";

// Icons (icon.svg, favicon.ico, apple-icon.png) and the link preview image
// (opengraph-image.png) are files in /app, which Next.js adds to <head>.
// scripts/make-images.mjs builds them from icon.svg.
export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: "Switchboard: compare electricity tariffs",
    template: "%s | Switchboard",
  },
  description,
  openGraph: {
    type: "website",
    siteName: "Switchboard",
    locale: "en_GB",
    title: "Switchboard: compare real electricity tariffs in two minutes",
    description,
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={geistSans.variable}>
      <body>
        <a href="#main-content" className={styles.skipLink}>
          Skip to main content
        </a>
        <header className={styles.header}>
          <div className="container">
            <Link href="/" className={styles.wordmark}>
              Switchboard
              <span className={styles.wordmarkTag}>Concept</span>
            </Link>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer className={styles.footer}>
          <div className="container">
            <IndependenceNotice />
          </div>
        </footer>
        {/* Real-user Core Web Vitals, including INP, which lab tools cannot
            measure. Only on Vercel, where its script is served. */}
        {process.env.NEXT_PUBLIC_VERCEL_ENV ? <SpeedInsights /> : null}
      </body>
    </html>
  );
}
