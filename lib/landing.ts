/**
 * Landing-page content + SEO/GEO helpers — the single source of truth shared by
 * the visible markup and the JSON-LD structured data (so they never drift).
 *
 * Copy here targets the SEO keyword set ("World Cup fantasy league", "World Cup
 * prediction game", "free", "with friends") and is written to be quotable by AI
 * answer engines (GEO): short, factual, self-contained Q&As.
 */
import { MATCHES } from "./matches";

/** Canonical site origin. Set NEXT_PUBLIC_SITE_URL per Vercel environment. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://worldcup.example.com").replace(
  /\/+$/,
  "",
);

export const APP_NAME = "World Cup Predictions";

/** SEO-locked hero headline (primary keyword phrase). */
export const HERO_H1 = "The Free World Cup Fantasy League & Prediction Game";

/** Generic sub-headline used when GEO detection is unavailable or unknown. */
export const HERO_SUB_GENERIC =
  "Predict every group-stage score, invite your friends, and climb your own private leaderboard — no sign-up to start, no cost.";

/** ── Real, honest tournament facts for the social-proof / stats strip ────────
 * These are derived from the seeded tournament data, not fabricated engagement
 * metrics, so they are truthful to render and safe to expose to search/AI. */
const TEAM_NAMES = new Set<string>();
for (const m of MATCHES) {
  TEAM_NAMES.add(m.home.name);
  TEAM_NAMES.add(m.away.name);
}
export const STATS = {
  teams: TEAM_NAMES.size,
  matches: MATCHES.length,
  groups: new Set(MATCHES.map((m) => m.group)).size,
} as const;

export interface Step {
  title: string;
  body: string;
}

/** "How It Works" — rendered as an <ol> for featured-snippet eligibility. */
export const STEPS: Step[] = [
  {
    title: "Create your league",
    body: "Spin up a private league in seconds and get a shareable invite link — no account or download required.",
  },
  {
    title: "Invite your friends",
    body: "Send the link to friends, family, or coworkers. Anyone who opens it joins your league automatically.",
  },
  {
    title: "Predict & win",
    body: "Call the score of every group-stage match. Earn 3 points for an exact score, 1 for the right result, and top the leaderboard.",
  },
];

export interface Faq {
  q: string;
  a: string;
}

/** FAQ copy — long-tail queries + LLM citation bait. Mirrored into FAQPage JSON-LD. */
export const FAQS: Faq[] = [
  {
    q: "What is World Cup Predictions?",
    a: "World Cup Predictions is a free online World Cup fantasy and prediction game. You create a private league, invite friends, and predict the score of every group-stage match. Points are awarded for accuracy and ranked on a live leaderboard.",
  },
  {
    q: "Is it free to play?",
    a: "Yes. Creating a league, inviting friends, and making predictions are completely free — no subscription or in-app purchase, and no sign-up needed to start playing.",
  },
  {
    q: "How does scoring work?",
    a: "You earn 3 points for predicting the exact final score of a match and 1 point for correctly predicting the result (win, lose, or draw). Points add up across all group-stage matches to rank your league's leaderboard.",
  },
  {
    q: "How do I invite friends to my league?",
    a: "When you create a league you get a unique invite link and a 6-character code. Share either one — anyone who opens the link or enters the code joins your league instantly.",
  },
  {
    q: "Do I need to create an account?",
    a: "No account is needed to start. You can create or join a league and start predicting right away — no registration, email, or app to install. If you'd like to play across devices, you can optionally save your account with an email and sign in elsewhere using a one-time code.",
  },
  {
    q: "When do predictions lock?",
    a: "Each match locks at kickoff. You can edit your predicted score any time before a match starts, but once it kicks off your prediction is final.",
  },
  {
    q: "How many people can join a league?",
    a: "There is no limit — invite as many friends as you like. Leagues work just as well for two people as for a whole office or friend group.",
  },
  {
    q: "Can I play on my phone?",
    a: "Yes. World Cup Predictions runs in any mobile or desktop browser, with no app to download. The interface is built mobile-first for predicting on the go.",
  },
  {
    q: "Can I use the same league on more than one device?",
    a: "Yes. Optionally save your account by adding an email — tap Sync inside your league — then choose Sign in on any other phone or computer and enter that email. You'll get a one-time code by email, and your league and predictions follow you. Email is optional and only used to recover your account on a new device.",
  },
];

/** Internal links for the footer (rich internal linking for crawlers). */
export const FOOTER_LINKS: { href: string; label: string }[] = [
  { href: "/create", label: "Create a League" },
  { href: "/join", label: "Join a League" },
  { href: "/predictions", label: "Make Predictions" },
  { href: "/leaderboard", label: "Leaderboard" },
];

/**
 * GEO: map an ISO-3166 country code to a tournament team that visitor likely
 * follows, so the hero sub-headline can reference a relevant team. Returns the
 * generic copy when the country is unknown (VPN, unsupported region, no header).
 */
const COUNTRY_TO_TEAM: Record<string, string> = {
  BR: "Brazil", HR: "Croatia", MX: "Mexico", CM: "Cameroon",
  AR: "Argentina", PL: "Poland", JP: "Japan", TN: "Tunisia",
  FR: "France", DK: "Denmark", AU: "Australia", PE: "Peru",
  ES: "Spain", DE: "Germany", MA: "Morocco", CA: "Canada",
  PT: "Portugal", UY: "Uruguay", GH: "Ghana", KR: "South Korea",
  BE: "Belgium", CH: "Switzerland", RS: "Serbia", US: "USA",
  NL: "Netherlands", EC: "Ecuador", SN: "Senegal", NG: "Nigeria",
  GB: "England", IR: "Iran", EG: "Egypt",
};

/**
 * Build the locale-aware hero sub-headline from a country code. Falls back to
 * the generic line for any unknown/missing country — never returns broken copy.
 */
export function heroSubheadline(countryCode: string | null | undefined): string {
  const team = countryCode ? COUNTRY_TO_TEAM[countryCode.toUpperCase()] : undefined;
  if (!team) return HERO_SUB_GENERIC;
  return `Think ${team} can go all the way? Predict every group-stage score, invite your friends, and climb your own private leaderboard — free, no sign-up to start.`;
}
