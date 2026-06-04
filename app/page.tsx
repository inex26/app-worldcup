import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { ResumeBanner } from "@/components/landing/ResumeBanner";
import { StickyCtas } from "@/components/landing/StickyCtas";
import { TrophyIcon } from "@/components/icons";
import {
  APP_NAME,
  FAQS,
  FOOTER_LINKS,
  HERO_H1,
  heroSubheadline,
  SITE_URL,
  STATS,
  STEPS,
} from "@/lib/landing";

/**
 * Home → public SEO/GEO-optimized landing page (server-rendered).
 *
 * Everything a crawler or AI answer engine needs is in the initial HTML: the
 * keyword H1, structured How-It-Works / FAQ copy, real tournament stats, canonical
 * + Open Graph tags, and JSON-LD (SoftwareApplication + FAQPage). The two
 * interactive pieces — a returning-user resume banner and the mobile sticky CTA
 * bar — are small client islands and never block the first paint.
 */

const DESCRIPTION =
  "Play the free World Cup fantasy league and prediction game. Create a private league, invite friends with a link, predict every group-stage score, and climb the leaderboard.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Absolute so the home title is the exact keyword phrase (no layout suffix).
  title: { absolute: HERO_H1 },
  description: DESCRIPTION,
  keywords: [
    "World Cup fantasy league",
    "World Cup prediction game",
    "World Cup predictions",
    "free World Cup game",
    "World Cup score predictor",
    "predict World Cup with friends",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: APP_NAME,
    title: HERO_H1,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: HERO_H1,
    description: DESCRIPTION,
  },
};

/** SoftwareApplication + FAQPage structured data, kept in sync with visible copy. */
function jsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: APP_NAME,
        applicationCategory: "GameApplication",
        operatingSystem: "Web",
        url: SITE_URL,
        description: DESCRIPTION,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
}

export default function HomePage() {
  // GEO: Vercel sets the visitor's country header at the edge. Used only to pick
  // a relevant team reference in the sub-headline; unknown/missing → generic copy.
  const country = headers().get("x-vercel-ip-country");
  const subheadline = heroSubheadline(country);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>

      <header className="landing-nav">
        <Link href="/" className="landing-logo">
          <TrophyIcon width={22} height={22} style={{ color: "var(--gold)" }} />
          <span>{APP_NAME}</span>
        </Link>
        <Link className="btn btn-ghost btn-sm" href="/signin">
          Sign in
        </Link>
      </header>

      <main id="main" className="landing">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="landing-hero" aria-labelledby="hero-h1">
          <ResumeBanner />
          <h1 id="hero-h1">{HERO_H1}</h1>
          <p className="hero-sub">{subheadline}</p>
          <div id="hero-ctas" className="hero-ctas">
            <Link className="btn btn-filled" href="/create">
              Create a League
            </Link>
            <Link className="btn btn-outlined" href="/join">
              Join a League
            </Link>
          </div>
        </section>

        {/* ── Social proof: real, honest tournament facts ──────── */}
        <section className="stats-strip" aria-label="Tournament at a glance">
          <div className="stat" aria-label={`${STATS.teams} national teams`}>
            <span className="stat-num">{STATS.teams}</span>
            <span className="stat-label">Teams</span>
          </div>
          <div className="stat" aria-label={`${STATS.matches} group-stage matches to predict`}>
            <span className="stat-num">{STATS.matches}</span>
            <span className="stat-label">Matches to predict</span>
          </div>
          <div className="stat" aria-label={`${STATS.groups} groups`}>
            <span className="stat-num">{STATS.groups}</span>
            <span className="stat-label">Groups</span>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────── */}
        <section className="landing-section" aria-labelledby="how-h2">
          <h2 id="how-h2">How it works</h2>
          <ol className="steps">
            {STEPS.map((step, i) => (
              <li key={step.title} className="card step">
                <span className="step-num" aria-hidden="true">
                  {i + 1}
                </span>
                <h3>{step.title}</h3>
                <p className="muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── FAQ (statically expanded → maximally crawlable) ──── */}
        <section className="landing-section" aria-labelledby="faq-h2">
          <h2 id="faq-h2">Frequently asked questions</h2>
          <dl className="faq">
            {FAQS.map((f) => (
              <div key={f.q} className="faq-item card">
                <dt>
                  <h3>{f.q}</h3>
                </dt>
                <dd className="muted">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── Closing CTA ──────────────────────────────────────── */}
        <section className="landing-cta" aria-label="Get started">
          <h2>Ready to play?</h2>
          <div className="hero-ctas">
            <Link className="btn btn-filled" href="/create">
              Create a League
            </Link>
            <Link className="btn btn-outlined" href="/join">
              Join a League
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <nav aria-label="Site">
          <ul>
            {FOOTER_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="muted">
          {APP_NAME} — the free World Cup fantasy league &amp; prediction game.
        </p>
      </footer>

      <StickyCtas watchId="hero-ctas" />

      {/* eslint-disable-next-line react/no-danger -- trusted, server-built structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }}
      />
    </>
  );
}
