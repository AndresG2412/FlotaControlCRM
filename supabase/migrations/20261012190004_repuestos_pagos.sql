-- Repuestos (conductores y admin) y pagos/vencimientos periódicos (solo admin).

create table public.repuesto_categorias (
  id smallint generated always as identity primary key,
  nombre text not null unique check (char_length(nombre) between 1 and 60),
  activa boolean not null default true
);
alter table public.repuesto_categorias enable row level security;

create policy repuesto_categorias_select on public.repuesto_categorias for select to authenticated
  using ((select private.es_usuario_activo()));
create policy repuesto_categorias_insert on public.repuesto_categorias for insert to authenticated
  with check ((select private.es_admin()));
create policy repuesto_categorias_update on public.repuesto_categorias for update to authenticated
  using ((select private.es_admin())) with check ((select private.es_admin()));

create table public.repuestos (
  id uuid primary key default gen_random_uuid(),
  buseta_id uuid not null references public.busetas (id),
  categoria_id smallint not null references public.repuesto_categorias (id),
  nombre text not null check (char_length(nombre) between 1 and 120),
  foto_path text check (foto_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'),
  costo bigint check (costo >= 0 and costo <= 50000000),
  kilometraje integer check (kilometraje >= 0 and kilometraje <= 5000000),
  taller text check (char_length(taller) <= 120),
  notas text check (char_length(notas) <= 1000),
  vuelta_id uuid references public.vueltas (id),
  estado text not null default 'activo' check (estado in ('activo', 'anulado')),
  motivo_anulacion text check (char_length(motivo_anulacion) <= 300),
  ocurrido_en timestamptz not null default now(),
  sincronizado_en timestamptz not null default now(),
  registrado_por uuid not null references public.perfiles (id),
  actualizado_en timestamptz,
  actualizado_por uuid references public.perfiles (id),
  check (estado = 'activo' or motivo_anulacion is not null)
);
alter table public.repuestos enable row level security;

create index repuestos_historial on public.repuestos (buseta_id, categoria_id, ocurrido_en desc);
create index repuestos_registrado_por on public.repuestos (registrado_por);

create trigger repuestos_auditoria before insert or update on public.repuestos
  for each row execute function private.auditar_registro();

create policy repuestos_select on public.repuestos for select to authenticated
  using ((select private.es_admin()) or registrado_por = (select auth.uid()));
create policy repuestos_insert on public.repuestos for insert to authenticated
  with check (
    (select private.es_admin())
    or ((select private.es_conductor())
        and (vuelta_id is null or private.puede_registrar_en_vuelta(vuelta_id)))
  );
create policy repuestos_update on public.repuestos for update to authenticated
  using ((select private.es_admin())
         or ((select private.es_conductor()) and registrado_por = (select auth.uid())))
  with check (
    (select private.es_admin())
    or ((select private.es_conductor())
        and (vuelta_id is null or private.puede_registrar_en_vuelta(vuelta_id)))
  );

-- ---------------------------------------------------------------------------
-- Pagos y vencimientos (seguro, SOAT, tecnomecánica, cuota a la empresa...)
-- ---------------------------------------------------------------------------
create table public.pagos_periodicos (
  id uuid primary key default gen_random_uuid(),
  buseta_id uuid references public.busetas (id),
  nombre text not null check (char_length(nombre) between 1 and 120),
  fecha_pago date not null,
  costo bigint not null check (costo >= 0 and costo <= 100000000),
  fecha_recordatorio date,
  fecha_vencimiento date,
  notas text check (char_length(notas) <= 1000),
  comprobante_path text check (comprobante_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'),
  recordatorio_enviado_en timestamptz,
  estado text not null default 'activo' check (estado in ('activo', 'anulado')),
  motivo_anulacion text check (char_length(motivo_anulacion) <= 300),
  creado_por uuid references public.perfiles (id) default auth.uid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz,
  check (estado = 'activo' or motivo_anulacion is not null)
);
alter table public.pagos_periodicos enable row level security;

create index pagos_recordatorio on public.pagos_periodicos (fecha_recordatorio)
  where recordatorio_enviado_en is null and estado = 'activo';

create trigger pagos_actualizado before update on public.pagos_periodicos
  for each row execute function private.tocar_actualizado_en();

-- Sin política de DELETE: no hay borrado físico.
create policy pagos_periodicos_select on public.pagos_periodicos for select to authenticated
  using ((select private.es_admin()));
create policy pagos_periodicos_insert on public.pagos_periodicos for insert to authenticated
  with check ((select private.es_admin()));
create policy pagos_periodicos_update on public.pagos_periodicos for update to authenticated
  using ((select private.es_admin())) with check ((select private.es_admin()));

revoke all on all tables in schema public from anon;
revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
