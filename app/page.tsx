import Link from "next/link";
import formStyles from "@/components/form.module.css";
import { IndependenceNotice } from "@/components/IndependenceNotice";
import styles from "./page.module.css";

const STEPS = [
  {
    title: "Your postcode",
    body: "Prices depend on where you live, so we start with your region.",
  },
  {
    title: "Your usage",
    body: "Answer a few quick questions, or enter the kWh from your bill.",
  },
  {
    title: "Compare tariffs",
    body: "See real prices and an estimated yearly cost for each tariff.",
  },
  {
    title: "Sign up",
    body: "A short demo form. It never asks for payment or bank details.",
  },
];

export default function HomePage() {
  return (
    <div className="container">
      <section className={styles.hero} aria-labelledby="hero-heading">
        <h1 id="hero-heading">Switching energy, in about two minutes</h1>
        <p className={styles.lead}>
          Compare electricity tariffs with real, up to date prices, in plain
          English, without the jargon.
        </p>
        <p>
          <Link href="/postcode" className={formStyles.button}>
            Start now
          </Link>
        </p>
        <IndependenceNotice className={styles.notice} />
      </section>

      <section aria-labelledby="how-heading">
        <h2 id="how-heading">How it works</h2>
        <ol className={styles.steps}>
          {STEPS.map((step) => (
            <li key={step.title} className={styles.step}>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
