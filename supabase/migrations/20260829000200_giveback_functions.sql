create schema if not exists private;

create or replace function private.accept_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  r public.requests;
  owner_id uuid;
begin
  select req.* into r
  from public.requests req
  join public.listings l on l.id=req.listing_id
  where req.id=p_request_id and req.status='pending' and l.owner_id=auth.uid()
  for update;

  if r.id is null then
    raise exception 'Request not found or you are not the listing owner';
  end if;

  select l.owner_id into owner_id from public.listings l where l.id=r.listing_id;

  update public.listings
  set status='reserved'
  where id=r.listing_id and owner_id=auth.uid() and status='active';

  if not found then
    raise exception 'Listing is no longer available';
  end if;

  update public.requests
  set status=case when id=r.id then 'accepted' else 'declined' end,
      updated_at=now()
  where listing_id=r.listing_id and status='pending';

  insert into public.conversations(listing_id,request_id,participant_a,participant_b)
  values(r.listing_id,r.id,least(r.requester_id,owner_id),greatest(r.requester_id,owner_id))
  on conflict do nothing;
end;
$$;

grant execute on function private.accept_request(uuid) to authenticated;

create or replace function private.get_or_create_conversation(p_listing_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  me uuid:=auth.uid();
  owner_id uuid;
  cid uuid;
begin
  if me is null then raise exception 'Authentication required'; end if;

  select owner_id into owner_id
  from public.listings
  where id=p_listing_id and status in ('active','reserved');

  if owner_id is null or owner_id=me then raise exception 'Invalid listing'; end if;

  if not exists(
    select 1 from public.requests
    where listing_id=p_listing_id and requester_id=me
  ) then
    raise exception 'Send a request before opening a private conversation';
  end if;

  insert into public.conversations(listing_id,participant_a,participant_b)
  values(p_listing_id,least(me,owner_id),greatest(me,owner_id))
  on conflict(listing_id,participant_a,participant_b)
  do update set updated_at=now()
  returning id into cid;

  return cid;
end;
$$;

grant execute on function private.get_or_create_conversation(uuid) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;
