insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chekou-images',
  'chekou-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "chekou_images_public_read" on storage.objects;
create policy "chekou_images_public_read" on storage.objects
for select using (bucket_id = 'chekou-images');

drop policy if exists "chekou_images_admin_insert" on storage.objects;
create policy "chekou_images_admin_insert" on storage.objects
for insert to authenticated
with check (bucket_id = 'chekou-images' and public.is_admin());

drop policy if exists "chekou_images_admin_update" on storage.objects;
create policy "chekou_images_admin_update" on storage.objects
for update to authenticated
using (bucket_id = 'chekou-images' and public.is_admin())
with check (bucket_id = 'chekou-images' and public.is_admin());

drop policy if exists "chekou_images_admin_delete" on storage.objects;
create policy "chekou_images_admin_delete" on storage.objects
for delete to authenticated
using (bucket_id = 'chekou-images' and public.is_admin());
