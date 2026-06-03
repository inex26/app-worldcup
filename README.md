# app-worldcup

Predict World Cup group-stage scores and compete with friends in private leagues.

**Stack:** Next.js (App Router) · TypeScript (strict) · **Supabase** (Postgres + Auth) ·
ESLint + Prettier · Vitest · CI on PRs · deploy on Vercel.

Leagues, members, and predictions live in Supabase and are shared across users and
devices. Every visitor is signed in **anonymously** (no password) so they get a stable
identity with zero friction. Row Level Security keeps each user scoped to their own
league's data and lets them edit only their own predictions.

## Local setup (≈10 minutes)

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (free tier is fine).

2. **Enable anonymous sign-ins.** In the dashboard go to
   **Authentication → Sign In / Providers** and turn on **Allow anonymous sign-ins**.
   The app cannot create a session without this.

3. **Run the schema.** Open **SQL Editor**, paste the entire contents of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. It creates the tables,
   RLS policies, the create/join RPCs, and seeds the 48 group-stage matches. It is
   idempotent — safe to re-run.

4. **Configure env vars.** Copy the example and fill in your project's values
   (Supabase dashboard → **Project Settings → API**):
   ```bash
   cp .env.example .env.local
   ```
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-public-key>
   ```
   `.env.local` is git-ignored — **never commit real values**. There are no hardcoded
   fallbacks; the app throws a clear error if either var is missing.

5. **Run it.**
   ```bash
   npm install
   npm run dev
   ```

## Scripts
```bash
npm run dev        # local dev server
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
npm run test       # vitest
npm run build      # production build
npm run format     # prettier --write
```

## Layout
```
app/             # Next.js App Router screens (home, create, join, predictions, leaderboard)
components/      # UI components + useSession hook
lib/             # domain logic + Supabase data access
  supabase/      # browser.ts (client) + server.ts (server) + env.ts
  data.ts        # query/RPC functions the screens call
  scoring.ts     # pure scoring/standings (unit-tested)
  matches.ts     # static tournament schedule (mirrors the seeded `matches` table)
middleware.ts    # refreshes the Supabase session cookie on each request
supabase/
  schema.sql     # tables + RLS + RPCs + match seed — run in the SQL editor
```

### Supabase client architecture
- `lib/supabase/browser.ts` — `createBrowserClient` singleton, for **Client Components only**.
- `lib/supabase/server.ts` — `createServerClient` (cookies via `next/headers`), for Server
  Components / Route Handlers / Server Actions.
- Sessions flow through **cookies** (managed by `@supabase/ssr` + `middleware.ts`) — no
  localStorage, no manual token passing.

### Data model (see `supabase/schema.sql`)
- `leagues` — name, unique `invite_code` (short, typed-in join code), unique `invite_token`
  (128-bit, hard-to-guess token behind the shareable invite link), `created_by`.
- `league_members` — `(league_id, user_id)` unique; carries each member's `display_name`.
- `matches` — global tournament reference data (the 48 group-stage games), seeded by the migration.
- `predictions` — one row per `(user_id, league_id, match_id)`; a user reads all predictions in
  their league (leaderboard) but can only write their own.

Create and join go through the `create_league` / `join_league` SQL functions so a league
can be looked up by invite code without exposing every league via `SELECT`. The invite-link
flow adds `peek_league_by_token` (resolve a league's name from the token, to confirm before
joining) and `join_league_by_token` (auto-join via the secure link).

## Known limitation (v1)
Anonymous sessions are tied to the browser cookie. Clearing cookies / using a different
browser starts a fresh identity. An email-link upgrade to claim an existing identity is
planned for v2.

## Deploy (Vercel)
Connect this repo to Vercel — it auto-detects Next.js. Set `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` in the Vercel project with separate **Preview** and
**Production** scopes (use a separate Supabase project per environment so preview traffic
never touches production data). Every PR gets a **preview URL**; merges to `main` deploy to
**production**.
