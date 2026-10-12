-- Base: perfiles y roles, helpers de autorización, busetas y catálogos de ruta.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- Nada en public es accesible para anon (no hay páginas públicas con datos).
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on functions from anon, public;
alter default privileges in schema public revoke all on sequences from anon;

-- ---------------------------------------------------------------------------
-- Perfiles: única fuente de verdad del rol.
-- Las filas las crea el admin; no hay registro público.
-- ---------------------------------------------------------------------------
create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 120),
  rol text not null check (rol in ('admin', 'conductor')),
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
alter table public.perfiles enable row level security;

create function private.rol_actual()
returns text
language sql stable security definer set search_path = ''
as $$
  select p.rol from public.perfiles p where p.id = auth.uid() and p.activo
$$;

create function private.es_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(private.rol_actual() = 'admin', false)
$$;

create function private.es_conductor()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(private.rol_actual() = 'conductor', false)
$$;

create function private.es_usuario_activo()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.rol_actual() is not null
$$;

create policy perfiles_select on public.perfiles for select to authenticated
  using (id = (select auth.uid()) or (select private.es_admin()));
create policy perfiles_insert on public.perfiles for insert to authenticated
  with check ((select private.es_admin()));
create policy perfiles_update on public.perfiles for update to authenticated
  using ((select private.es_admin()))
  with check ((select private.es_admin()));

-- ---------------------------------------------------------------------------
-- Auditoría común para tablas de registros (dinero, repuestos, vueltas).
-- registrado_por y sincronizado_en los pone el servidor y no se pueden cambiar.
-- ---------------------------------------------------------------------------
create function private.auditar_registro()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.registrado_por := coalesce(auth.uid(), new.registrado_por);
    new.sincronizado_en := now();
    new.actualizado_en := null;
    new.actualizado_por := null;
  else
    new.registrado_por := old.registrado_por;
    new.sincronizado_en := old.sincronizado_en;
    new.ocurrido_en := old.ocurrido_en;
    new.actualizado_en := now();
    new.actualizado_por := auth.uid();
  end if;
  return new;
end;
$$;

create function private.tocar_actualizado_en()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

create trigger perfiles_actualizado before update on public.perfiles
  for each row execute function private.tocar_actualizado_en();

-- ---------------------------------------------------------------------------
-- Busetas
-- ---------------------------------------------------------------------------
create table public.busetas (
  id uuid primary key default gen_random_uuid(),
  placa text not null unique check (placa ~ '^[A-Z]{3}[0-9]{3}$'),
  numero_interno text check (char_length(numero_interno) <= 20),
  empresa text check (char_length(empresa) <= 80),
  modelo text check (char_length(modelo) <= 20),
  motor text check (char_length(motor) <= 40),
  puestos smallint check (puestos between 1 and 60),
  aceite text check (char_length(aceite) <= 60),
  activa boolean not null default true,
  creado_en timestamptz not null default now()
);
alter table public.busetas enable row level security;

create policy busetas_select on public.busetas for select to authenticated
  using ((select private.es_usuario_activo()));
create policy busetas_insert on public.busetas for insert to authenticated
  with check ((select private.es_admin()));
create policy busetas_update on public.busetas for update to authenticated
  using ((select private.es_admin())) with check ((select private.es_admin()));

-- ---------------------------------------------------------------------------
-- Terminales y tramos (catálogo fijo, se carga en la migración de datos).
-- ---------------------------------------------------------------------------
create table public.terminales (
  codigo text primary key check (codigo ~ '^[a-z]+$'),
  nombre text not null
);
alter table public.terminales enable row level security;

create table public.tramos (
  id text primary key,
  sentido text not null check (sentido in ('ida', 'regreso')),
  orden smallint not null check (orden between 1 and 3),
  origen text not null references public.terminales (codigo),
  destino text not null references public.terminales (codigo),
  unique (sentido, orden),
  unique (sentido, origen),
  check (origen <> destino)
);
alter table public.tramos enable row level security;

create policy terminales_select on public.terminales for select to authenticated
  using ((select private.es_usuario_activo()));
create policy tramos_select on public.tramos for select to authenticated
  using ((select private.es_usuario_activo()));

revoke all on all tables in schema public from anon;
revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
