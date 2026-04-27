-- Storage RLS policies for avatars bucket
create policy "avatars_public_read"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "avatars_auth_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'avatars');

create policy "avatars_owner_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'avatars' and auth.uid()::text = owner);

-- Storage RLS policies for venues bucket
create policy "venues_public_read"
on storage.objects for select
using (bucket_id = 'venues');

create policy "venues_auth_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'venues');

create policy "venues_owner_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'venues' and auth.uid()::text = owner);
