-- ============================================================================
-- app-worldcup — Supabase schema + Row Level Security
--
-- Run this whole file in the Supabase SQL editor on a fresh project. It is
-- idempotent: re-running it is safe (tables use IF NOT EXISTS, policies and
-- functions are dropped/replaced). Postgres has no `CREATE POLICY IF NOT
-- EXISTS`, so we `DROP POLICY IF EXISTS` then `CREATE`.
--
-- Auth model: email + password (Supabase Auth → Email provider ON, "Confirm
-- email" OFF so sign-up returns a session immediately; "Allow anonymous sign-ins"
-- OFF). The user picks a username at sign-up (their display name, stored in
-- auth.users user_metadata and passed to the create/join RPCs as p_display_name).
-- Identity is auth.uid() exactly as before, so every table + RLS policy below is
-- unchanged — only how a session is obtained differs.
-- ============================================================================

-- gen_random_uuid() / gen_random_bytes() live here.
create extension if not exists pgcrypto;

-- ── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.leagues (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  invite_code  text not null unique,
  -- Secure, hard-to-guess token for the shareable invite link. 16 random bytes
  -- = 128 bits of entropy, hex-encoded (32 chars). The DB unique constraint
  -- guards against the (astronomically unlikely) collision.
  invite_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_by   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now()
);

-- Migration for projects created before invite_token existed (idempotent).
alter table public.leagues
  add column if not exists invite_token text not null default encode(gen_random_bytes(16), 'hex');
create unique index if not exists leagues_invite_token_key on public.leagues (invite_token);

create table if not exists public.league_members (
  id           uuid primary key default gen_random_uuid(),
  league_id    uuid not null references public.leagues (id) on delete cascade,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  display_name text not null,
  joined_at    timestamptz not null default now(),
  unique (league_id, user_id)
);

create index if not exists league_members_user_id_idx on public.league_members (user_id);

-- Matches = global tournament reference data, read by everyone and written only by
-- the sync job (football-data.org -> service role) or the generated seed
-- (supabase/seed-matches.sql). `id` is the football-data.org match id (text).
-- Knockout matches start with NULL teams (TBD) and are filled as rounds resolve.
-- NOTE: re-modelled for the real 2026 format (48 teams / 12 groups / knockouts);
-- dropped+recreated because columns changed. Pre-launch, so no real data is lost.
drop table if exists public.matches cascade;
create table public.matches (
  id         text primary key,                  -- football-data.org match id
  stage      text not null,                     -- group | r32 | r16 | qf | sf | third | final
  "group"    text,                              -- A..L (null for knockouts)
  matchday   int,                               -- 1..3 (group stage only)
  kickoff    timestamptz,                        -- null if not yet scheduled
  home_name  text, home_flag text, home_tla text,
  away_name  text, away_flag text, away_tla text,
  ft_home    int,  ft_away int,                  -- full-time score (null until played)
  status     text not null default 'scheduled', -- scheduled | live | finished
  duration   text,                              -- REGULAR | EXTRA_TIME | PENALTY_SHOOTOUT
  winner     text,                              -- HOME | AWAY | DRAW (null until decided)
  updated_at timestamptz not null default now()
);

-- Recreated so the match_id FK points at the rebuilt matches table (pre-launch wipe of predictions).
drop table if exists public.predictions cascade;
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

-- Resolve a league's name from a secure invite token, without joining. Lets the
-- invite-link screen show "Join [League Name]" to a not-yet-member. Returns
-- null if the token is unknown. SECURITY DEFINER so it can read the league
-- without granting broad SELECT; the 128-bit token is the access control.
create or replace function public.peek_league_by_token(p_token text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select name from public.leagues where invite_token = p_token;
$$;

-- Join a league via its secure invite token. Idempotent: re-joining a league
-- the caller is already in is a no-op (returns the league). Raises if the token
-- is unknown so the client can show its "invalid link" state.
create or replace function public.join_league_by_token(
  p_token text,
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
  where invite_token = p_token;

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
grant execute on function public.peek_league_by_token(text) to authenticated;
grant execute on function public.join_league_by_token(text, text) to authenticated;
grant execute on function public.is_league_member(uuid) to authenticated;

-- == Match seed ==
-- Run supabase/seed-matches.sql AFTER this file. It's generated by
-- scripts/sync-matches.mjs from football-data.org (104 real 2026 matches; knockouts load
-- as TBD). After launch, the sync job keeps teams + results updated automatically.
