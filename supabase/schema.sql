-- Схема базы данных «Тренер личности» для Supabase.
-- Скрипт идемпотентный: его можно выполнять повторно.

create extension if not exists pgcrypto;

-- ---------- Профили ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  friend_code text not null unique,
  avatar text not null default '🙂',
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1,
  streak integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nickname_len check (char_length(nickname) between 3 and 24)
);
create unique index if not exists profiles_nickname_lower on public.profiles (lower(nickname));
create index if not exists profiles_xp on public.profiles (xp desc);

alter table public.profiles enable row level security;
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- запрет менять системные поля через API
create or replace function public.protect_profile() returns trigger language plpgsql as $$
begin
  new.id := old.id;
  new.friend_code := old.friend_code;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists protect_profile on public.profiles;
create trigger protect_profile before update on public.profiles for each row execute function public.protect_profile();

-- автосоздание профиля при регистрации
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  base text;
  nick text;
  code text;
  i int := 0;
begin
  base := coalesce(nullif(trim(new.raw_user_meta_data->>'nickname'), ''), split_part(new.email, '@', 1));
  base := left(regexp_replace(base, '[^[:alnum:]_.-]', '', 'g'), 20);
  if char_length(base) < 3 then base := 'user' || base; end if;
  nick := base;
  while exists (select 1 from public.profiles where lower(nickname) = lower(nick)) loop
    i := i + 1;
    nick := left(base, 19) || (floor(random() * 9000) + 1000)::int::text;
    exit when i > 20;
  end loop;
  loop
    code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from public.profiles where friend_code = code);
  end loop;
  insert into public.profiles (id, nickname, friend_code) values (new.id, nick, code);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- Личные данные (синхронизация) ----------
create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_data enable row level security;
drop policy if exists "user_data own" on public.user_data;
create policy "user_data own" on public.user_data for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Друзья ----------
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references public.profiles(id) on delete cascade,
  addressee uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (requester, addressee),
  check (requester <> addressee)
);
alter table public.friendships enable row level security;
drop policy if exists "friendships read" on public.friendships;
create policy "friendships read" on public.friendships for select to authenticated using (auth.uid() in (requester, addressee));
drop policy if exists "friendships accept" on public.friendships;
create policy "friendships accept" on public.friendships for update to authenticated using (addressee = auth.uid()) with check (addressee = auth.uid() and status = 'accepted');
drop policy if exists "friendships delete" on public.friendships;
create policy "friendships delete" on public.friendships for delete to authenticated using (auth.uid() in (requester, addressee));

create or replace function public.send_friend_request(target text) returns text
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  other uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  select id into other from profiles where friend_code = upper(trim(target)) or lower(nickname) = lower(trim(target)) limit 1;
  if other is null then raise exception 'user not found'; end if;
  if other = me then raise exception 'self'; end if;
  if exists (select 1 from friendships where requester = other and addressee = me) then
    update friendships set status = 'accepted' where requester = other and addressee = me;
    return 'accepted';
  end if;
  if exists (select 1 from friendships where requester = me and addressee = other) then return 'exists'; end if;
  insert into friendships (requester, addressee) values (me, other);
  return 'sent';
end $$;

-- ---------- Челленджи ----------
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  description text not null default '',
  kind text not null default 'custom',
  days integer not null check (days between 3 and 90),
  start_date date not null,
  code text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.challenge_members (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  checkins date[] not null default '{}',
  primary key (challenge_id, user_id)
);

create or replace function public.is_challenge_member(cid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from challenge_members where challenge_id = cid and user_id = auth.uid());
$$;

alter table public.challenges enable row level security;
drop policy if exists "challenges read" on public.challenges;
create policy "challenges read" on public.challenges for select to authenticated using (created_by = auth.uid() or public.is_challenge_member(id));
drop policy if exists "challenges delete" on public.challenges;
create policy "challenges delete" on public.challenges for delete to authenticated using (created_by = auth.uid());

alter table public.challenge_members enable row level security;
drop policy if exists "members read" on public.challenge_members;
create policy "members read" on public.challenge_members for select to authenticated using (public.is_challenge_member(challenge_id));
drop policy if exists "members checkin" on public.challenge_members;
create policy "members checkin" on public.challenge_members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "members leave" on public.challenge_members;
create policy "members leave" on public.challenge_members for delete to authenticated using (user_id = auth.uid());

create or replace function public.create_challenge(p_title text, p_description text, p_kind text, p_days int, p_start date)
returns public.challenges language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  c challenges;
  cd text;
begin
  if me is null then raise exception 'not authenticated'; end if;
  loop
    cd := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from challenges where code = cd);
  end loop;
  insert into challenges (title, description, kind, days, start_date, code, created_by)
    values (p_title, coalesce(p_description, ''), p_kind, p_days, p_start, cd, me) returning * into c;
  insert into challenge_members (challenge_id, user_id) values (c.id, me);
  return c;
end $$;

create or replace function public.join_challenge(join_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  cid uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  select id into cid from challenges where code = upper(trim(join_code));
  if cid is null then raise exception 'challenge not found'; end if;
  insert into challenge_members (challenge_id, user_id) values (cid, me) on conflict do nothing;
  return cid;
end $$;

-- ---------- Удаление аккаунта ----------
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  delete from auth.users where id = auth.uid();
end $$;

-- ---------- Пинг (не даёт бесплатному проекту «уснуть») ----------
create table if not exists public.keepalive (id int primary key, pinged_at timestamptz not null default now());
alter table public.keepalive enable row level security;
create or replace function public.ping() returns timestamptz
language sql security definer set search_path = public as $$
  insert into keepalive (id, pinged_at) values (1, now())
  on conflict (id) do update set pinged_at = excluded.pinged_at
  returning pinged_at;
$$;

-- ---------- Права ----------
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
revoke all on function public.send_friend_request(text) from public, anon;
grant execute on function public.send_friend_request(text) to authenticated;
revoke all on function public.create_challenge(text, text, text, int, date) from public, anon;
grant execute on function public.create_challenge(text, text, text, int, date) to authenticated;
revoke all on function public.join_challenge(text) from public, anon;
grant execute on function public.join_challenge(text) to authenticated;
grant execute on function public.ping() to anon, authenticated;
