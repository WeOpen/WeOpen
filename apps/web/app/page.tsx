import type { Metadata } from "next";
import Link from "next/link";

const landingSignals = [
  ["Status", "Public preview"],
  ["Console", "/dashboard"],
  ["Launch", "Coming soon"]
];

export const metadata: Metadata = {
  title: "WeOpen",
  description: "Public landing page placeholder for WeOpen"
};

export default function HomePage() {
  return (
    <main className="landing-page" aria-label="WeOpen public landing placeholder">
      <section className="landing-shell">
        <header className="landing-nav" aria-label="Landing navigation">
          <Link className="landing-brand" href="/" aria-label="WeOpen home">
            WeOpen
          </Link>
          <div className="landing-nav-actions">
            <Link className="landing-console-link" href="/design-system">
              Design system
            </Link>
            <Link className="landing-console-link" href="/dashboard">
              Open console
            </Link>
          </div>
        </header>

        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-copy">
            <p className="landing-eyebrow">Personal platform</p>
            <h1 id="landing-title">WeOpen</h1>
            <p className="landing-description">
              A public landing page will live here. For now, this static placeholder keeps the root path open while the admin console stays behind its own routes.
            </p>
          </div>

          <dl className="landing-signal-grid" aria-label="Landing page status">
            {landingSignals.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </section>
    </main>
  );
}
