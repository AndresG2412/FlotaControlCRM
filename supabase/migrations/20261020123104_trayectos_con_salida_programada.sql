-- Paso 7: cada trayecto (ida o regreso) se enlaza con su salida programada, así
-- el regreso también queda "realizada" (antes solo la ida, vía vueltas).
--
-- - Al crear un trayecto, si no trae salida, se enlaza solo con la salida
--   pendiente de la misma buseta, el mismo día y el mismo sentido (si la hay).
-- - Una salida tiene a lo sumo un trayecto.
-- - Al enlazar, la salida pasa a "realizada"; al desenlazar vuelve a "pendiente"
--   si ningún otro trayecto la usa.
-- - Un trayecto sin salida (día no programado) lo resuelve el admin: lo enlaza
--   a mano o lo registra como adicional (registrar_salida_adicional).

alter table public.trayectos
  add column salida_programada_id uuid references public.programacion_salidas (id);

create unique index trayectos_una_por_salida on public.trayectos (salida_programada_id)
  where salida_programada_id is not null;

-- Trayectos que ya existían: se enlazan con la misma regla, uno por uno (antes de
-- crear los triggers, para que el de protección no revierta el cambio).
do $$
declare
  t record;
  v_salida uuid;
begin
  for t in select tr.id, tr.vuelta_id, tr.fecha, tr.sentido from public.trayectos tr
           where tr.salida_programada_id is null order by tr.ocurrido_en loop
    select s.id into v_salida
    from public.programacion_salidas s
    join public.vueltas v on v.id = t.vuelta_id and v.buseta_id = s.buseta_id
    where s.fecha = t.fecha and s.sentido = t.sentido and s.estado in ('pendiente', 'realizada')
      and not exists (select 1 from public.trayectos o where o.salida_programada_id = s.id)
    order by s.hora nulls last
    limit 1;
    if v_salida is not null then
      update public.trayectos set salida_programada_id = v_salida where id = t.id;
      update public.programacion_salidas set estado = 'realizada' where id = v_salida and estado = 'pendiente';
    end if;
  end loop;
end $$;

create function private.enlazar_trayecto_con_salida()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.salida_programada_id is null then
    select s.id into new.salida_programada_id
    from public.programacion_salidas s
    join public.vueltas v on v.id = new.vuelta_id and v.buseta_id = s.buseta_id
    where s.fecha = new.fecha
      and s.sentido = new.sentido
      and s.estado = 'pendiente'
      and not exists (select 1 from public.trayectos t where t.salida_programada_id = s.id)
    order by s.hora nulls last
    limit 1;
  end if;
  return new;
end;
$$;

create trigger trayectos_enlazar_salida before insert on public.trayectos
  for each row execute function private.enlazar_trayecto_con_salida();

-- El enlace solo lo cambia el admin (el conductor no envía este campo).
create function private.proteger_salida_de_trayecto()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.salida_programada_id is distinct from old.salida_programada_id and not private.es_admin() then
    new.salida_programada_id := old.salida_programada_id;
  end if;
  return new;
end;
$$;

create trigger trayectos_proteger_salida before update on public.trayectos
  for each row execute function private.proteger_salida_de_trayecto();

create function private.marcar_salida_de_trayecto()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.salida_programada_id is not null
     and (tg_op = 'INSERT' or new.salida_programada_id is distinct from old.salida_programada_id) then
    update public.programacion_salidas set estado = 'realizada'
      where id = new.salida_programada_id and estado = 'pendiente';
  end if;
  if tg_op = 'UPDATE' and old.salida_programada_id is not null
     and old.salida_programada_id is distinct from new.salida_programada_id then
    update public.programacion_salidas s set estado = 'pendiente'
      where s.id = old.salida_programada_id and s.estado = 'realizada'
        and not exists (select 1 from public.trayectos t where t.salida_programada_id = s.id)
        and not exists (select 1 from public.vueltas v where v.salida_programada_id = s.id);
  end if;
  return new;
end;
$$;

create trigger trayectos_marcar_salida after insert or update of salida_programada_id on public.trayectos
  for each row execute function private.marcar_salida_de_trayecto();

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
