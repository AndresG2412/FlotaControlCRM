-- Programación mensual de salidas y salidas adicionales.
-- Las salidas canceladas nunca se borran: quedan marcadas con su motivo.

create table public.programacion_salidas (
  id uuid primary key default gen_random_uuid(),
  buseta_id uuid not null references public.busetas (id),
  fecha date not null,
  hora time,
  sentido text not null check (sentido in ('ida', 'regreso')),
  tipo text not null default 'programada' check (tipo in ('programada', 'adicional')),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'realizada', 'cancelada_por_adicional', 'cancelada')),
  cancelada_por_id uuid references public.programacion_salidas (id),
  notas text check (char_length(notas) <= 500),
  creado_por uuid references public.perfiles (id) default auth.uid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz,
  check (estado <> 'cancelada_por_adicional' or cancelada_por_id is not null)
);
alter table public.programacion_salidas enable row level security;

-- No puede haber dos salidas vigentes en el mismo día y sentido.
create unique index programacion_una_por_dia on public.programacion_salidas (buseta_id, fecha, sentido)
  where estado in ('pendiente', 'realizada');
create index programacion_fecha on public.programacion_salidas (buseta_id, fecha);

create function private.tocar_actualizado_en_programacion()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.actualizado_en := now();
  new.creado_por := old.creado_por;
  new.creado_en := old.creado_en;
  return new;
end;
$$;

create trigger programacion_actualizado before update on public.programacion_salidas
  for each row execute function private.tocar_actualizado_en_programacion();

create policy programacion_select on public.programacion_salidas for select to authenticated
  using ((select private.es_usuario_activo()));
create policy programacion_insert on public.programacion_salidas for insert to authenticated
  with check ((select private.es_admin()));
create policy programacion_update on public.programacion_salidas for update to authenticated
  using ((select private.es_admin())) with check ((select private.es_admin()));

alter table public.vueltas
  add constraint vueltas_salida_programada_fk
  foreign key (salida_programada_id) references public.programacion_salidas (id);

-- Cuando una vuelta se crea desde una salida programada, esa salida queda realizada.
create function private.marcar_salida_realizada()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.salida_programada_id is not null
     and (tg_op = 'INSERT' or new.salida_programada_id is distinct from old.salida_programada_id) then
    update public.programacion_salidas
      set estado = 'realizada'
      where id = new.salida_programada_id and estado = 'pendiente';
  end if;
  return new;
end;
$$;

create trigger vueltas_marcar_salida after insert or update of salida_programada_id on public.vueltas
  for each row execute function private.marcar_salida_realizada();

-- Registra una salida adicional y cancela la salida programada del día siguiente
-- en el mismo sentido (la buseta está en otra ciudad). Todo en una transacción.
create function public.registrar_salida_adicional(
  p_buseta uuid,
  p_fecha date,
  p_hora time default null,
  p_sentido text default 'ida',
  p_notas text default null
)
returns uuid
language plpgsql set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not private.es_admin() then
    raise exception 'Solo el administrador registra salidas adicionales'
      using errcode = 'insufficient_privilege';
  end if;

  insert into public.programacion_salidas (buseta_id, fecha, hora, sentido, tipo, estado, notas)
  values (p_buseta, p_fecha, p_hora, p_sentido, 'adicional', 'pendiente', p_notas)
  returning id into v_id;

  update public.programacion_salidas
    set estado = 'cancelada_por_adicional', cancelada_por_id = v_id
    where buseta_id = p_buseta
      and fecha = p_fecha + 1
      and sentido = p_sentido
      and tipo = 'programada'
      and estado = 'pendiente';

  return v_id;
end;
$$;

revoke all on all tables in schema public from anon;
revoke all on function public.registrar_salida_adicional(uuid, date, time, text, text) from public, anon;
grant execute on function public.registrar_salida_adicional(uuid, date, time, text, text) to authenticated;
revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
