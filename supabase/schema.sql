-- ============================================================================
-- app-worldcup — Supabase schema + Row Level Security
--
-- Run this whole file in the Supabase SQL editor on a fresh project. It is
-- idempotent: re-running it is safe (tables use IF NOT EXISTS, policies and
-- functions are dropped/replaced). Postgres has no `CREATE POLICY IF NOT
-- EXISTS`, so we `DROP POLICY IF EXISTS` then `CREATE`.
--
-- Auth model: every visitor signs in anonymously (Supabase Auth → "Allow
-- anonymous sign-ins" must be enabled in the dashboard). The user's identity is
-- auth.uid(); there are no passwords in v1.
-- ============================================================================

-- gen_random_uuid() / gen_random_bytes() live here.
create extension if not exists pgcrypto;

-- ── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.leagues (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text not null unique,
  created_by  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.league_members (
  id           uuid primary key default gen_random_uuid(),
  league_id    uuid not null references public.leagues (id) on delete cascade,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  display_name text not null,
  joined_at    timestamptz not null default now(),
  unique (league_id, user_id)
);

create index if not exists league_members_user_id_idx on public.league_members (user_id);

-- Matches are global tournament reference data (the same 48 group-stage games
-- for everyone), seeded below. The app renders them from lib/matches.ts; this
-- table exists so predictions can key off a real match id. `id` is the static
-- match code ("A1".."H6"), so it is text rather than a uuid.
create table if not exists public.matches (
  id         text primary key,
  "group"    text not null,
  round      int  not null,
  home_name  text not null,
  home_flag  text not null,
  away_name  text not null,
  away_flag  text not null,
  kickoff    timestamptz not null,
  home_score int,
  away_score int
);

create table if not exists public.predictions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  league_id  uuid not null references public.leagues (id) on delete cascade,
  match_id   text not null references public.matches (id),
  home_score int  not null,
  away_score int  not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One prediction per match per member, per league.
  unique (user_id, league_id, match_id)
);

create index if not exists predictions_league_id_idx on public.predictions (league_id);

-- ── Membership helper (SECURITY DEFINER avoids RLS recursion) ────────────────
-- Used by policies below. It bypasses RLS so the league_members SELECT policy
-- can reference league_members without recursing on itself.
create or replace function public.is_league_member(p_league_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.league_members
    where league_id = p_league_id
      and user_id = auth.uid()
  );
$$;

-- ── Row Level Security ───────────────────────────────────────────────────────

alter table public.leagues         enable row level security;
alter table public.league_members  enable row level security;
alter table public.matches         enable row level security;
alter table public.predictions     enable row level security;

-- leagues: a member can read their league. Inserts go through create_league()
-- (SECURITY DEFINER), so no INSERT policy is needed for the normal flow.
drop policy if exists "leagues_select_member" on public.leagues;
create policy "leagues_select_member"
  on public.leagues for select
  to authenticated
  using (public.is_league_member(id));

-- league_members: a member can read everyone in their league (for the
-- leaderboard) and can insert only their own membership row.
drop policy if exists "league_members_select_same_league" on public.league_members;
create policy "league_members_select_same_league"
  on public.league_members for select
  to authenticated
  using (public.is_league_member(league_id));

drop policy if exists "league_members_insert_self" on public.league_members;
create policy "league_members_insert_self"
  on public.league_members for insert
  to authenticated
  with check (user_id = auth.uid());

-- matches: global reference data, readable by any signed-in user. No writes
-- from the app (managed via this migration / future admin tooling).
drop policy if exists "matches_select_all" on public.matches;
create policy "matches_select_all"
  on public.matches for select
  to authenticated
  using (true);

-- predictions: any league member can read all predictions in that league
-- (leaderboard); a user can only insert/update/delete their own.
drop policy if exists "predictions_select_same_league" on public.predictions;
create policy "predictions_select_same_league"
  on public.predictions for select
  to authenticated
  using (public.is_league_member(league_id));

drop policy if exists "predictions_insert_self" on public.predictions;
create policy "predictions_insert_self"
  on public.predictions for insert
  to authenticated
  with check (user_id = auth.uid() and public.is_league_member(league_id));

drop policy if exists "predictions_update_self" on public.predictions;
create policy "predictions_update_self"
  on public.predictions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "predictions_delete_self" on public.predictions;
create policy "predictions_delete_self"
  on public.predictions for delete
  to authenticated
  using (user_id = auth.uid());

-- ── RPCs for the create / join flows ─────────────────────────────────────────
-- Both are SECURITY DEFINER so they can read a league by invite code and create
-- the league + membership atomically, without granting broad SELECT on leagues.

-- Create a new league and add the caller as its first member.
create or replace function public.create_league(
  p_name text,
  p_invite_code text,
  p_display_name text
)
returns public.leagues
language plpgsql
security definer
set search_path = public
as $$
declare
  v_league public.leagues;
begin
  insert into public.leagues (name, invite_code, created_by)
  values (p_name, upper(p_invite_code), auth.uid())
  returning * into v_league;

  insert into public.league_members (league_id, user_id, display_name)
  values (v_league.id, auth.uid(), p_display_name);

  return v_league;
end;
$$;

-- Join an existing league by invite code. Idempotent: re-joining a league the
-- caller is already in is a no-op (returns the league). Raises if the code is
-- unknown so the client can show its "league not found" state.
create or replace function public.join_league(
  p_invite_code text,
  p_display_name text
)
returns public.leagues
language plpgsql
security definer
set search_path = public
as $$
declare
  v_league public.leagues;
begin
  select * into v_league
  from public.leagues
  where invite_code = upper(p_invite_code);

  if not found then
    raise exception 'league not found' using errcode = 'no_data_found';
  end if;

  insert into public.league_members (league_id, user_id, display_name)
  values (v_league.id, auth.uid(), p_display_name)
  on conflict (league_id, user_id) do nothing;

  return v_league;
end;
$$;

grant execute on function public.create_league(text, text, text) to authenticated;
grant execute on function public.join_league(text, text) to authenticated;
grant execute on function public.is_league_member(uuid) to authenticated;

-- ── Seed: 48 group-stage matches (mirrors lib/matches.ts) ────────────────────
-- Matchday 1 is in the past with final scores; matchdays 2 & 3 are upcoming.
insert into public.matches
  (id, "group", round, home_name, home_flag, away_name, away_flag, kickoff, home_score, away_score)
values
  ('A1', 'A', 1, 'Brazil', '🇧🇷', 'Croatia', '🇭🇷', '2026-06-01T13:00:00.000Z', 0, 1),
  ('A2', 'A', 1, 'Mexico', '🇲🇽', 'Cameroon', '🇨🇲', '2026-06-01T14:00:00.000Z', 1, 0),
  ('A3', 'A', 2, 'Brazil', '🇧🇷', 'Mexico', '🇲🇽', '2026-06-05T15:00:00.000Z', null, null),
  ('A4', 'A', 2, 'Cameroon', '🇨🇲', 'Croatia', '🇭🇷', '2026-06-05T16:00:00.000Z', null, null),
  ('A5', 'A', 3, 'Cameroon', '🇨🇲', 'Brazil', '🇧🇷', '2026-06-08T17:00:00.000Z', null, null),
  ('A6', 'A', 3, 'Croatia', '🇭🇷', 'Mexico', '🇲🇽', '2026-06-08T18:00:00.000Z', null, null),
  ('B1', 'B', 1, 'Argentina', '🇦🇷', 'Poland', '🇵🇱', '2026-06-01T14:00:00.000Z', 2, 3),
  ('B2', 'B', 1, 'Japan', '🇯🇵', 'Tunisia', '🇹🇳', '2026-06-01T15:00:00.000Z', 3, 2),
  ('B3', 'B', 2, 'Argentina', '🇦🇷', 'Japan', '🇯🇵', '2026-06-05T16:00:00.000Z', null, null),
  ('B4', 'B', 2, 'Tunisia', '🇹🇳', 'Poland', '🇵🇱', '2026-06-05T17:00:00.000Z', null, null),
  ('B5', 'B', 3, 'Tunisia', '🇹🇳', 'Argentina', '🇦🇷', '2026-06-08T18:00:00.000Z', null, null),
  ('B6', 'B', 3, 'Poland', '🇵🇱', 'Japan', '🇯🇵', '2026-06-08T13:00:00.000Z', null, null),
  ('C1', 'C', 1, 'France', '🇫🇷', 'Denmark', '🇩🇰', '2026-06-01T15:00:00.000Z', 0, 1),
  ('C2', 'C', 1, 'Australia', '🇦🇺', 'Peru', '🇵🇪', '2026-06-01T16:00:00.000Z', 1, 0),
  ('C3', 'C', 2, 'France', '🇫🇷', 'Australia', '🇦🇺', '2026-06-05T17:00:00.000Z', null, null),
  ('C4', 'C', 2, 'Peru', '🇵🇪', 'Denmark', '🇩🇰', '2026-06-05T18:00:00.000Z', null, null),
  ('C5', 'C', 3, 'Peru', '🇵🇪', 'France', '🇫🇷', '2026-06-08T13:00:00.000Z', null, null),
  ('C6', 'C', 3, 'Denmark', '🇩🇰', 'Australia', '🇦🇺', '2026-06-08T14:00:00.000Z', null, null),
  ('D1', 'D', 1, 'Spain', '🇪🇸', 'Germany', '🇩🇪', '2026-06-01T16:00:00.000Z', 2, 3),
  ('D2', 'D', 1, 'Morocco', '🇲🇦', 'Canada', '🇨🇦', '2026-06-01T17:00:00.000Z', 3, 2),
  ('D3', 'D', 2, 'Spain', '🇪🇸', 'Morocco', '🇲🇦', '2026-06-05T18:00:00.000Z', null, null),
  ('D4', 'D', 2, 'Canada', '🇨🇦', 'Germany', '🇩🇪', '2026-06-05T13:00:00.000Z', null, null),
  ('D5', 'D', 3, 'Canada', '🇨🇦', 'Spain', '🇪🇸', '2026-06-08T14:00:00.000Z', null, null),
  ('D6', 'D', 3, 'Germany', '🇩🇪', 'Morocco', '🇲🇦', '2026-06-08T15:00:00.000Z', null, null),
  ('E1', 'E', 1, 'Portugal', '🇵🇹', 'Uruguay', '🇺🇾', '2026-06-01T17:00:00.000Z', 0, 1),
  ('E2', 'E', 1, 'Ghana', '🇬🇭', 'South Korea', '🇰🇷', '2026-06-01T18:00:00.000Z', 1, 0),
  ('E3', 'E', 2, 'Portugal', '🇵🇹', 'Ghana', '🇬🇭', '2026-06-05T13:00:00.000Z', null, null),
  ('E4', 'E', 2, 'South Korea', '🇰🇷', 'Uruguay', '🇺🇾', '2026-06-05T14:00:00.000Z', null, null),
  ('E5', 'E', 3, 'South Korea', '🇰🇷', 'Portugal', '🇵🇹', '2026-06-08T15:00:00.000Z', null, null),
  ('E6', 'E', 3, 'Uruguay', '🇺🇾', 'Ghana', '🇬🇭', '2026-06-08T16:00:00.000Z', null, null),
  ('F1', 'F', 1, 'Belgium', '🇧🇪', 'Switzerland', '🇨🇭', '2026-06-01T18:00:00.000Z', 2, 3),
  ('F2', 'F', 1, 'Serbia', '🇷🇸', 'USA', '🇺🇸', '2026-06-01T13:00:00.000Z', 3, 2),
  ('F3', 'F', 2, 'Belgium', '🇧🇪', 'Serbia', '🇷🇸', '2026-06-05T14:00:00.000Z', null, null),
  ('F4', 'F', 2, 'USA', '🇺🇸', 'Switzerland', '🇨🇭', '2026-06-05T15:00:00.000Z', null, null),
  ('F5', 'F', 3, 'USA', '🇺🇸', 'Belgium', '🇧🇪', '2026-06-08T16:00:00.000Z', null, null),
  ('F6', 'F', 3, 'Switzerland', '🇨🇭', 'Serbia', '🇷🇸', '2026-06-08T17:00:00.000Z', null, null),
  ('G1', 'G', 1, 'Netherlands', '🇳🇱', 'Ecuador', '🇪🇨', '2026-06-01T13:00:00.000Z', 0, 1),
  ('G2', 'G', 1, 'Senegal', '🇸🇳', 'Nigeria', '🇳🇬', '2026-06-01T14:00:00.000Z', 1, 0),
  ('G3', 'G', 2, 'Netherlands', '🇳🇱', 'Senegal', '🇸🇳', '2026-06-05T15:00:00.000Z', null, null),
  ('G4', 'G', 2, 'Nigeria', '🇳🇬', 'Ecuador', '🇪🇨', '2026-06-05T16:00:00.000Z', null, null),
  ('G5', 'G', 3, 'Nigeria', '🇳🇬', 'Netherlands', '🇳🇱', '2026-06-08T17:00:00.000Z', null, null),
  ('G6', 'G', 3, 'Ecuador', '🇪🇨', 'Senegal', '🇸🇳', '2026-06-08T18:00:00.000Z', null, null),
  ('H1', 'H', 1, 'England', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Wales', '🏴󠁧󠁢󠁷󠁬󠁳󠁿', '2026-06-01T14:00:00.000Z', 2, 3),
  ('H2', 'H', 1, 'Iran', '🇮🇷', 'Egypt', '🇪🇬', '2026-06-01T15:00:00.000Z', 3, 2),
  ('H3', 'H', 2, 'England', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Iran', '🇮🇷', '2026-06-05T16:00:00.000Z', null, null),
  ('H4', 'H', 2, 'Egypt', '🇪🇬', 'Wales', '🏴󠁧󠁢󠁷󠁬󠁳󠁿', '2026-06-05T17:00:00.000Z', null, null),
  ('H5', 'H', 3, 'Egypt', '🇪🇬', 'England', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '2026-06-08T18:00:00.000Z', null, null),
  ('H6', 'H', 3, 'Wales', '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'Iran', '🇮🇷', '2026-06-08T13:00:00.000Z', null, null)
on conflict (id) do nothing;
