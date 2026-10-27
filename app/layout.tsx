import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { IndependenceNotice } from "@/components/IndependenceNotice";
import { ApolloWrapper } from "./ApolloWrapper";
import styles from "./layout.module.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Switchboard: compare electricity tariffs",
    template: "%s | Switchboard",
  },
  description:
    "An independent concept for a simple, accessible energy switching journey, using real tariff prices from the public Octopus Energy API.",
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
          <ApolloWrapper>{children}</ApolloWrapper>
        </main>
        <footer className={styles.footer}>
          <div className="container">
            <IndependenceNotice />
          </div>
        </footer>
      </body>
    </html>
  );
}
