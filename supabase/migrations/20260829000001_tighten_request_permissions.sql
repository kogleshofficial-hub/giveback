drop policy if exists requests_update on public.requests;
create policy requests_owner_update on public.requests for update to authenticated
using (exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = (select auth.uid())))
with check (exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = (select auth.uid())));
create policy requests_requester_cancel on public.requests for update to authenticated
using ((select auth.uid()) = requester_id)
with check ((select auth.uid()) = requester_id and status = 'cancelled');
