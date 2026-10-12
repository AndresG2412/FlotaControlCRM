-- Operación de la vuelta: configuración de dinero, vueltas, trayectos,
-- planillas, polilla, encomiendas, gastos y cierre.
--
-- Regla dura: los conductores solo ven SUS registros y nunca totales.
-- Gastos fijos, cierres y reportes son exclusivos del admin.

-- ---------------------------------------------------------------------------
-- Configuración (solo admin escribe)
-- ---------------------------------------------------------------------------
create table public.tarifas (
  id uuid primary key default gen_random_uuid(),
  origen text not null references public.terminales (codigo),
  destino text not null references public.terminales (codigo),
  precio bigint not null check (precio > 0 and precio <= 2000000),
  vigente_desde date not null default (now() at time zone 'America/Bogota')::date,
  creado_por uuid references public.perfiles (id) default auth.uid(),
  creado_en timestamptz not null default now(),
  unique (origen, destino, vigente_desde),
  check (origen <> destino)
);
alter table public.tarifas enable row level security;

-- Los conductores pueden leer tarifas: sirven para sugerir el monto facturado.
create policy tarifas_select on public.tarifas for select to authenticated
  using ((select private.es_usuario_activo()));
create policy tarifas_insert on public.tarifas for insert to authenticated
  with check ((select private.es_admin()));
create policy tarifas_update on public.tarifas for update to authenticated
  using ((select private.es_admin())) with check ((select private.es_admin()));

-- Gastos fijos por vuelta, versionados por fecha de vigencia.
-- Para "quitar" un concepto desde una fecha, se agrega una fila con valor 0.
create table public.gastos_fijos_config (
  id uuid primary key default gen_random_uuid(),
  concepto text not null check (char_length(concepto) between 1 and 80),
  valor bigint not null check (valor >= 0 and valor <= 10000000),
  se_paga_en_ruta boolean not null default true,
  vigente_desde date not null,
  creado_por uuid references public.perfiles (id) default auth.uid(),
  creado_en timestamptz not null default now(),
  unique (concepto, vigente_desde)
);
alter table public.gastos_fijos_config enable row level security;

-- Sin política de DELETE: no hay borrado físico.
create policy gastos_fijos_config_select on public.gastos_fijos_config for select to authenticated
  using ((select private.es_admin()));
create policy gastos_fijos_config_insert on public.gastos_fijos_config for insert to authenticated
  with check ((select private.es_admin()));
create policy gastos_fijos_config_update on public.gastos_fijos_config for update to authenticated
  using ((select private.es_admin())) with check ((select private.es_admin()));

-- ---------------------------------------------------------------------------
-- Vueltas (ida + regreso). Sin campos de dinero: los ven ambos conductores.
-- ---------------------------------------------------------------------------
create table public.vueltas (
  id uuid primary key default gen_random_uuid(),
  buseta_id uuid not null references public.busetas (id),
  tipo text not null default 'completa' check (tipo in ('completa', 'varada')),
  estado text not null default 'en_curso' check (estado in ('en_curso', 'finalizada', 'cerrada')),
  fecha_inicio date not null,
  conductor_florencia_id uuid references public.perfiles (id),
  conductor_pitalito_id uuid references public.perfiles (id),
  salida_programada_id uuid, -- FK en la migración de programación
  notas text check (char_length(notas) <= 1000),
  ocurrido_en timestamptz not null default now(),
  sincronizado_en timestamptz not null default now(),
  registrado_por uuid not null references public.perfiles (id),
  actualizado_en timestamptz,
  actualizado_por uuid references public.perfiles (id),
  check (conductor_florencia_id is distinct from conductor_pitalito_id
         or conductor_florencia_id is null)
);
alter table public.vueltas enable row level security;

-- Una sola vuelta en curso por buseta.
create unique index vueltas_una_en_curso on public.vueltas (buseta_id) where estado = 'en_curso';
create index vueltas_fecha on public.vueltas (buseta_id, fecha_inicio desc);
create index vueltas_conductor_florencia on public.vueltas (conductor_florencia_id);
create index vueltas_conductor_pitalito on public.vueltas (conductor_pitalito_id);

create trigger vueltas_auditoria before insert or update on public.vueltas
  for each row execute function private.auditar_registro();

create function private.asignado_a_vuelta(p_vuelta uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.vueltas v
    where v.id = p_vuelta
      and auth.uid() in (v.conductor_florencia_id, v.conductor_pitalito_id)
  )
$$;

-- Un conductor puede registrar en una vuelta si está asignado y no está cerrada.
create function private.puede_registrar_en_vuelta(p_vuelta uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.es_conductor() and exists (
    select 1 from public.vueltas v
    where v.id = p_vuelta
      and v.estado <> 'cerrada'
      and auth.uid() in (v.conductor_florencia_id, v.conductor_pitalito_id)
  )
$$;

create policy vueltas_select on public.vueltas for select to authenticated
  using (
    (select private.es_admin())
    or ((select private.es_conductor())
        and (select auth.uid()) in (conductor_florencia_id, conductor_pitalito_id))
  );
create policy vueltas_insert on public.vueltas for insert to authenticated
  with check (
    (select private.es_admin())
    or ((select private.es_conductor())
        and estado = 'en_curso'
        and (select auth.uid()) in (conductor_florencia_id, conductor_pitalito_id))
  );
create policy vueltas_update on public.vueltas for update to authenticated
  using (
    (select private.es_admin())
    or ((select private.es_conductor())
        and estado <> 'cerrada'
        and (select auth.uid()) in (conductor_florencia_id, conductor_pitalito_id))
  )
  with check (
    (select private.es_admin())
    or ((select private.es_conductor())
        and estado in ('en_curso', 'finalizada')
        and (select auth.uid()) in (conductor_florencia_id, conductor_pitalito_id))
  );

-- ---------------------------------------------------------------------------
-- Trayectos (ida / regreso de una vuelta)
-- ---------------------------------------------------------------------------
create table public.trayectos (
  id uuid primary key default gen_random_uuid(),
  vuelta_id uuid not null references public.vueltas (id),
  sentido text not null check (sentido in ('ida', 'regreso')),
  fecha date not null,
  hora_salida time,
  terminal_fin text references public.terminales (codigo), -- dónde terminó si no llegó al final (varada)
  ocurrido_en timestamptz not null default now(),
  sincronizado_en timestamptz not null default now(),
  registrado_por uuid not null references public.perfiles (id),
  actualizado_en timestamptz,
  actualizado_por uuid references public.perfiles (id),
  unique (vuelta_id, sentido)
);
alter table public.trayectos enable row level security;

create trigger trayectos_auditoria before insert or update on public.trayectos
  for each row execute function private.auditar_registro();

create function private.vuelta_de_trayecto(p_trayecto uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select t.vuelta_id from public.trayectos t where t.id = p_trayecto
$$;

create function private.puede_registrar_en_trayecto(p_trayecto uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.puede_registrar_en_vuelta(private.vuelta_de_trayecto(p_trayecto))
$$;

create policy trayectos_select on public.trayectos for select to authenticated
  using ((select private.es_admin()) or private.asignado_a_vuelta(vuelta_id));
create policy trayectos_insert on public.trayectos for insert to authenticated
  with check ((select private.es_admin()) or private.puede_registrar_en_vuelta(vuelta_id));
create policy trayectos_update on public.trayectos for update to authenticated
  using ((select private.es_admin()) or private.puede_registrar_en_vuelta(vuelta_id))
  with check ((select private.es_admin()) or private.puede_registrar_en_vuelta(vuelta_id));

-- ---------------------------------------------------------------------------
-- Planillas
-- ---------------------------------------------------------------------------
create table public.planillas (
  id uuid primary key default gen_random_uuid(),
  trayecto_id uuid not null references public.trayectos (id),
  terminal text not null references public.terminales (codigo),
  emitida boolean not null,
  motivo_sin_planilla text check (char_length(motivo_sin_planilla) <= 300),
  numero text check (char_length(numero) <= 40),
  neto bigint,
  pasajeros smallint check (pasajeros between 0 and 60),
  foto_path text check (foto_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'),
  estado text not null default 'activa' check (estado in ('activa', 'anulada')),
  motivo_anulacion text check (char_length(motivo_anulacion) <= 300),
  ocurrido_en timestamptz not null default now(),
  sincronizado_en timestamptz not null default now(),
  registrado_por uuid not null references public.perfiles (id),
  actualizado_en timestamptz,
  actualizado_por uuid references public.perfiles (id),
  check (
    (emitida and neto is not null and neto between 0 and 20000000 and motivo_sin_planilla is null)
    or (not emitida and neto is null and motivo_sin_planilla is not null)
  ),
  check (estado = 'activa' or motivo_anulacion is not null)
);
alter table public.planillas enable row level security;

create unique index planillas_una_por_terminal on public.planillas (trayecto_id, terminal)
  where estado = 'activa';
create index planillas_registrado_por on public.planillas (registrado_por);

create trigger planillas_auditoria before insert or update on public.planillas
  for each row execute function private.auditar_registro();

-- La terminal debe ser de salida en el sentido del trayecto (la final no emite planilla).
create function private.validar_planilla()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.trayectos t
    join public.tramos tr on tr.sentido = t.sentido and tr.origen = new.terminal
    where t.id = new.trayecto_id
  ) then
    raise exception 'La terminal % no emite planilla en este trayecto', new.terminal
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger planillas_validar before insert or update on public.planillas
  for each row execute function private.validar_planilla();

create policy planillas_select on public.planillas for select to authenticated
  using ((select private.es_admin()) or registrado_por = (select auth.uid()));
create policy planillas_insert on public.planillas for insert to authenticated
  with check ((select private.es_admin()) or private.puede_registrar_en_trayecto(trayecto_id));
create policy planillas_update on public.planillas for update to authenticated
  using ((select private.es_admin())
         or (registrado_por = (select auth.uid()) and private.puede_registrar_en_trayecto(trayecto_id)))
  with check ((select private.es_admin()) or private.puede_registrar_en_trayecto(trayecto_id));

-- ---------------------------------------------------------------------------
-- Polilla: pasajeros recogidos en la vía
-- sobrante = cobrado − facturado; destino_sobrante dice a dónde fue.
-- ---------------------------------------------------------------------------
create table public.polilla_pasajeros (
  id uuid primary key default gen_random_uuid(),
  trayecto_id uuid not null references public.trayectos (id),
  tramo_id text not null references public.tramos (id), -- tramo donde subió
  destino text not null references public.terminales (codigo),
  monto_cobrado bigint not null check (monto_cobrado > 0 and monto_cobrado <= 2000000),
  facturado boolean not null default false,
  terminal_facturacion text references public.terminales (codigo),
  monto_facturado bigint not null default 0 check (monto_facturado >= 0 and monto_facturado <= 2000000),
  sobrante bigint generated always as (monto_cobrado - monto_facturado) stored,
  destino_sobrante text not null default 'polilla' check (destino_sobrante in ('polilla', 'conductor')),
  estado text not null default 'activo' check (estado in ('activo', 'anulado')),
  motivo_anulacion text check (char_length(motivo_anulacion) <= 300),
  ocurrido_en timestamptz not null default now(),
  sincronizado_en timestamptz not null default now(),
  registrado_por uuid not null references public.perfiles (id),
  actualizado_en timestamptz,
  actualizado_por uuid references public.perfiles (id),
  check (
    (facturado and terminal_facturacion is not null)
    or (not facturado and terminal_facturacion is null and monto_facturado = 0)
  ),
  check (estado = 'activo' or motivo_anulacion is not null)
);
alter table public.polilla_pasajeros enable row level security;

create index polilla_trayecto on public.polilla_pasajeros (trayecto_id);
create index polilla_registrado_por on public.polilla_pasajeros (registrado_por);

create trigger polilla_auditoria before insert or update on public.polilla_pasajeros
  for each row execute function private.auditar_registro();

-- El tramo debe ser del sentido del trayecto y el destino debe estar más adelante.
create function private.validar_polilla()
returns trigger
language plpgsql set search_path = ''
as $$
declare
  v_sentido text;
  v_orden smallint;
begin
  select t.sentido into v_sentido from public.trayectos t where t.id = new.trayecto_id;
  select tr.orden into v_orden from public.tramos tr
    where tr.id = new.tramo_id and tr.sentido = v_sentido;
  if v_orden is null then
    raise exception 'El tramo % no pertenece al sentido del trayecto', new.tramo_id
      using errcode = 'check_violation';
  end if;
  if not exists (
    select 1 from public.tramos tr
    where tr.sentido = v_sentido and tr.destino = new.destino and tr.orden >= v_orden
  ) then
    raise exception 'Destino % inválido para el tramo %', new.destino, new.tramo_id
      using errcode = 'check_violation';
  end if;
  if new.facturado and not exists (
    select 1 from public.tramos tr
    where tr.sentido = v_sentido and tr.origen = new.terminal_facturacion and tr.orden > v_orden
  ) then
    raise exception 'Terminal de facturación % inválida', new.terminal_facturacion
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger polilla_validar before insert or update on public.polilla_pasajeros
  for each row execute function private.validar_polilla();

create policy polilla_select on public.polilla_pasajeros for select to authenticated
  using ((select private.es_admin()) or registrado_por = (select auth.uid()));
create policy polilla_insert on public.polilla_pasajeros for insert to authenticated
  with check ((select private.es_admin()) or private.puede_registrar_en_trayecto(trayecto_id));
create policy polilla_update on public.polilla_pasajeros for update to authenticated
  using ((select private.es_admin())
         or (registrado_por = (select auth.uid()) and private.puede_registrar_en_trayecto(trayecto_id)))
  with check ((select private.es_admin()) or private.puede_registrar_en_trayecto(trayecto_id));

-- ---------------------------------------------------------------------------
-- Encomiendas
-- ---------------------------------------------------------------------------
create table public.encomiendas (
  id uuid primary key default gen_random_uuid(),
  trayecto_id uuid not null references public.trayectos (id),
  recibida_en_terminal text references public.terminales (codigo),
  recibida_en_tramo text references public.tramos (id),
  destino text not null references public.terminales (codigo),
  descripcion text check (char_length(descripcion) <= 200),
  monto bigint not null check (monto > 0 and monto <= 5000000),
  estado text not null default 'activa' check (estado in ('activa', 'anulada')),
  motivo_anulacion text check (char_length(motivo_anulacion) <= 300),
  ocurrido_en timestamptz not null default now(),
  sincronizado_en timestamptz not null default now(),
  registrado_por uuid not null references public.perfiles (id),
  actualizado_en timestamptz,
  actualizado_por uuid references public.perfiles (id),
  check (num_nonnulls(recibida_en_terminal, recibida_en_tramo) = 1),
  check (estado = 'activa' or motivo_anulacion is not null)
);
alter table public.encomiendas enable row level security;

create index encomiendas_trayecto on public.encomiendas (trayecto_id);
create index encomiendas_registrado_por on public.encomiendas (registrado_por);

create trigger encomiendas_auditoria before insert or update on public.encomiendas
  for each row execute function private.auditar_registro();

create policy encomiendas_select on public.encomiendas for select to authenticated
  using ((select private.es_admin()) or registrado_por = (select auth.uid()));
create policy encomiendas_insert on public.encomiendas for insert to authenticated
  with check ((select private.es_admin()) or private.puede_registrar_en_trayecto(trayecto_id));
create policy encomiendas_update on public.encomiendas for update to authenticated
  using ((select private.es_admin())
         or (registrado_por = (select auth.uid()) and private.puede_registrar_en_trayecto(trayecto_id)))
  with check ((select private.es_admin()) or private.puede_registrar_en_trayecto(trayecto_id));

-- ---------------------------------------------------------------------------
-- Gastos variables (ACPM, ligas, extras, arreglos en ruta)
-- ---------------------------------------------------------------------------
create table public.gastos_variables (
  id uuid primary key default gen_random_uuid(),
  vuelta_id uuid not null references public.vueltas (id),
  trayecto_id uuid references public.trayectos (id),
  tipo text not null check (tipo in ('acpm', 'liga', 'extra', 'arreglo')),
  descripcion text check (char_length(descripcion) <= 200),
  monto bigint not null check (monto > 0 and monto <= 10000000),
  terminal text references public.terminales (codigo),
  galones numeric(6, 2) check (galones > 0),
  lugar text check (char_length(lugar) <= 120),
  foto_path text check (foto_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'),
  estado text not null default 'activo' check (estado in ('activo', 'anulado')),
  motivo_anulacion text check (char_length(motivo_anulacion) <= 300),
  ocurrido_en timestamptz not null default now(),
  sincronizado_en timestamptz not null default now(),
  registrado_por uuid not null references public.perfiles (id),
  actualizado_en timestamptz,
  actualizado_por uuid references public.perfiles (id),
  check (tipo <> 'liga' or terminal is not null),
  check (tipo not in ('extra', 'arreglo') or descripcion is not null),
  check (estado = 'activo' or motivo_anulacion is not null)
);
alter table public.gastos_variables enable row level security;

create index gastos_variables_vuelta on public.gastos_variables (vuelta_id);
create index gastos_variables_registrado_por on public.gastos_variables (registrado_por);

create trigger gastos_variables_auditoria before insert or update on public.gastos_variables
  for each row execute function private.auditar_registro();

create policy gastos_variables_select on public.gastos_variables for select to authenticated
  using ((select private.es_admin()) or registrado_por = (select auth.uid()));
create policy gastos_variables_insert on public.gastos_variables for insert to authenticated
  with check ((select private.es_admin()) or private.puede_registrar_en_vuelta(vuelta_id));
create policy gastos_variables_update on public.gastos_variables for update to authenticated
  using ((select private.es_admin())
         or (registrado_por = (select auth.uid()) and private.puede_registrar_en_vuelta(vuelta_id)))
  with check ((select private.es_admin()) or private.puede_registrar_en_vuelta(vuelta_id));

-- ---------------------------------------------------------------------------
-- Gastos fijos de cada vuelta (copia de la configuración vigente). Solo admin.
-- ---------------------------------------------------------------------------
create table public.vuelta_gastos_fijos (
  id uuid primary key default gen_random_uuid(),
  vuelta_id uuid not null references public.vueltas (id),
  concepto text not null,
  valor bigint not null check (valor >= 0 and valor <= 10000000),
  se_paga_en_ruta boolean not null,
  unique (vuelta_id, concepto)
);
alter table public.vuelta_gastos_fijos enable row level security;

create policy vuelta_gastos_fijos_select on public.vuelta_gastos_fijos for select to authenticated
  using ((select private.es_admin()));
create policy vuelta_gastos_fijos_update on public.vuelta_gastos_fijos for update to authenticated
  using ((select private.es_admin())) with check ((select private.es_admin()));

-- Al crear una vuelta completa (o cambiar tipo/fecha) se copian los fijos vigentes.
-- Las varadas quedan sin gastos (todo en 0).
create function private.cargar_gastos_fijos()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.tipo = old.tipo and new.fecha_inicio = old.fecha_inicio then
      return new;
    end if;
    delete from public.vuelta_gastos_fijos where vuelta_id = new.id;
  end if;

  if new.tipo = 'completa' then
    insert into public.vuelta_gastos_fijos (vuelta_id, concepto, valor, se_paga_en_ruta)
    select new.id, c.concepto, c.valor, c.se_paga_en_ruta
    from (
      select distinct on (g.concepto) g.concepto, g.valor, g.se_paga_en_ruta
      from public.gastos_fijos_config g
      where g.vigente_desde <= new.fecha_inicio
      order by g.concepto, g.vigente_desde desc
    ) c
    where c.valor > 0;
  end if;
  return new;
end;
$$;

create trigger vueltas_gastos_fijos after insert or update of tipo, fecha_inicio on public.vueltas
  for each row execute function private.cargar_gastos_fijos();

-- ---------------------------------------------------------------------------
-- Cierre de la vuelta (cuadre de caja). Solo admin.
-- ---------------------------------------------------------------------------
create table public.vuelta_cierres (
  vuelta_id uuid primary key references public.vueltas (id),
  efectivo_entregado bigint not null check (efectivo_entregado >= 0 and efectivo_entregado <= 50000000),
  notas text check (char_length(notas) <= 1000),
  cerrado_por uuid not null references public.perfiles (id) default auth.uid(),
  cerrado_en timestamptz not null default now()
);
alter table public.vuelta_cierres enable row level security;

-- Sin política de DELETE: no hay borrado físico.
create policy vuelta_cierres_select on public.vuelta_cierres for select to authenticated
  using ((select private.es_admin()));
create policy vuelta_cierres_insert on public.vuelta_cierres for insert to authenticated
  with check ((select private.es_admin()));
create policy vuelta_cierres_update on public.vuelta_cierres for update to authenticated
  using ((select private.es_admin())) with check ((select private.es_admin()));

-- Solo el admin puede cerrar o reabrir una vuelta.
create function private.proteger_estado_vuelta()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if not private.es_admin() then
    if new.estado = 'cerrada' or old.estado = 'cerrada' then
      raise exception 'Solo el administrador puede cerrar o reabrir una vuelta'
        using errcode = 'insufficient_privilege';
    end if;
    if new.buseta_id <> old.buseta_id then
      raise exception 'No se puede cambiar la buseta de una vuelta'
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end;
$$;

create trigger vueltas_proteger_estado before update on public.vueltas
  for each row execute function private.proteger_estado_vuelta();

create function public.cerrar_vuelta(p_vuelta uuid, p_efectivo_entregado bigint, p_notas text default null)
returns void
language plpgsql set search_path = ''
as $$
begin
  if not private.es_admin() then
    raise exception 'Solo el administrador puede cerrar vueltas' using errcode = 'insufficient_privilege';
  end if;

  insert into public.vuelta_cierres (vuelta_id, efectivo_entregado, notas, cerrado_por, cerrado_en)
  values (p_vuelta, p_efectivo_entregado, p_notas, auth.uid(), now())
  on conflict (vuelta_id) do update
    set efectivo_entregado = excluded.efectivo_entregado,
        notas = excluded.notas,
        cerrado_por = excluded.cerrado_por,
        cerrado_en = excluded.cerrado_en;

  update public.vueltas set estado = 'cerrada' where id = p_vuelta;
  if not found then
    raise exception 'Vuelta no encontrada' using errcode = 'no_data_found';
  end if;
end;
$$;

revoke all on all tables in schema public from anon;
revoke all on function public.cerrar_vuelta(uuid, bigint, text) from public, anon;
grant execute on function public.cerrar_vuelta(uuid, bigint, text) to authenticated;
revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
