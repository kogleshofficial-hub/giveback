create or replace function public.notify_request_event() returns trigger language plpgsql security definer set search_path = public as $$
declare
  recipient uuid;
  listing_title text;
begin
  select l.owner_id, l.title into recipient, listing_title from public.listings l where l.id = new.listing_id;
  if tg_op = 'INSERT' then
    if recipient is not null and recipient <> new.requester_id then
      insert into public.notifications(user_id,type,title,body,listing_id,request_id)
      values(recipient,'request_new','New request',coalesce(listing_title,'Your listing') || ' received a new request.',new.listing_id,new.id);
    end if;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status in ('accepted','declined') then
      insert into public.notifications(user_id,type,title,body,listing_id,request_id)
      values(new.requester_id,'request_' || new.status,case when new.status='accepted' then 'Request accepted' else 'Request declined' end,
        case when new.status='accepted' then coalesce(listing_title,'Your request') || ' was accepted. You can now arrange the handover.' else coalesce(listing_title,'Your request') || ' was declined.' end,new.listing_id,new.id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists requests_notify_event on public.requests;
create trigger requests_notify_event after insert or update of status on public.requests for each row execute procedure public.notify_request_event();

create or replace function public.notify_message_event() returns trigger language plpgsql security definer set search_path = public as $$
declare
  recipient uuid;
  listing_id uuid;
begin
  select case when c.participant_a = new.sender_id then c.participant_b else c.participant_a end, c.listing_id
    into recipient, listing_id from public.conversations c where c.id = new.conversation_id;
  if recipient is not null then
    insert into public.notifications(user_id,type,title,body,listing_id)
    values(recipient,'message_new','New message','You received a new private message.',listing_id);
  end if;
  return new;
end;
$$;

drop trigger if exists messages_notify_event on public.messages;
create trigger messages_notify_event after insert on public.messages for each row execute procedure public.notify_message_event();

revoke execute on function public.notify_request_event() from public, anon, authenticated;
revoke execute on function public.notify_message_event() from public, anon, authenticated;
