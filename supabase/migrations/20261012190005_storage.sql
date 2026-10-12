-- Bucket privado para fotos (planillas, recibos, repuestos, comprobantes).
-- Ruta obligatoria: {uid del usuario}/{uuid}.{jpg|png|webp}. Acceso con URLs firmadas.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidencias', 'evidencias', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy evidencias_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'evidencias'
    and (select private.es_usuario_activo())
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
  );

-- Cada quien ve sus fotos; el admin ve todas. Sin update ni delete.
create policy evidencias_select on storage.objects for select to authenticated
  using (
    bucket_id = 'evidencias'
    and (
      (select private.es_admin())
      or ((select private.es_usuario_activo())
          and (storage.foldername(name))[1] = (select auth.uid())::text)
    )
  );
