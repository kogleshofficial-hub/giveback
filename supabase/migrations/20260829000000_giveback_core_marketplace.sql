create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'GiveBack member' check (char_length(display_name) between 2 and 60),
  area text check (area is null or char_length(area) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120), category text not null check (category in ('Books','School','Clothing','Home','Electronics','Sports','Toys & Games','Other')),
  condition text not null check (condition in ('Like new','Good','Fair')), area text not null check (char_length(area) between 2 and 120),
  description text not null check (char_length(description) between 10 and 2000), image_url text,
  status text not null default 'active' check (status in ('active','reserved','claimed','removed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), claimed_at timestamptz
);

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(), listing_id uuid not null references public.listings(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade, message text not null check (char_length(message) between 10 and 1000),
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (listing_id, requester_id)
);

create table if not exists public.saved_listings (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (user_id, listing_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null, reason text not null check (reason in ('spam','misleading','unsafe','prohibited','other')),
  details text check (details is null or char_length(details) <= 1000), status text not null default 'open' check (status in ('open','reviewed','closed')), created_at timestamptz not null default now()
);

create index if not exists listings_status_created_idx on public.listings(status, created_at desc);
create index if not exists listings_category_idx on public.listings(category);
create index if not exists listings_owner_idx on public.listings(owner_id);
create index if not exists requests_listing_idx on public.requests(listing_id, created_at desc);
create index if not exists requests_requester_idx on public.requests(requester_id, created_at desc);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'GiveBack member')) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.requests enable row level security;
alter table public.saved_listings enable row level security;
alter table public.reports enable row level security;

grant select on public.profiles to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select on public.listings to anon, authenticated;
grant insert, update, delete on public.listings to authenticated;
grant select, insert, update on public.requests to authenticated;
grant select, insert, delete on public.saved_listings to authenticated;
grant insert, select on public.reports to authenticated;

drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read on public.profiles for select to anon, authenticated using (true);
drop policy if exists profiles_owner_insert on public.profiles;
create policy profiles_owner_insert on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists profiles_owner_update on public.profiles;
create policy profiles_owner_update on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists listings_public_read on public.listings;
create policy listings_public_read on public.listings for select to anon, authenticated using (status in ('active','reserved') or (select auth.uid()) = owner_id);
drop policy if exists listings_owner_insert on public.listings;
create policy listings_owner_insert on public.listings for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists listings_owner_update on public.listings;
create policy listings_owner_update on public.listings for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists listings_owner_delete on public.listings;
create policy listings_owner_delete on public.listings for delete to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists requests_read on public.requests;
create policy requests_read on public.requests for select to authenticated using ((select auth.uid()) = requester_id or exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = (select auth.uid())));
drop policy if exists requests_insert on public.requests;
create policy requests_insert on public.requests for insert to authenticated with check ((select auth.uid()) = requester_id and exists (select 1 from public.listings l where l.id = listing_id and l.status = 'active' and l.owner_id <> (select auth.uid())));
drop policy if exists requests_update on public.requests;
create policy requests_update on public.requests for update to authenticated using ((select auth.uid()) = requester_id or exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = (select auth.uid()))) with check ((select auth.uid()) = requester_id or exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = (select auth.uid())));

drop policy if exists saved_owner_all on public.saved_listings;
create policy saved_owner_all on public.saved_listings for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert to authenticated with check ((select auth.uid()) = reporter_id);
drop policy if exists reports_read_own on public.reports;
create policy reports_read_own on public.reports for select to authenticated using ((select auth.uid()) = reporter_id);

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
drop trigger if exists listings_updated_at on public.listings;
create trigger listings_updated_at before update on public.listings for each row execute procedure public.set_updated_at();
drop trigger if exists requests_updated_at on public.requests;
create trigger requests_updated_at before update on public.requests for each row execute procedure public.set_updated_at();

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
