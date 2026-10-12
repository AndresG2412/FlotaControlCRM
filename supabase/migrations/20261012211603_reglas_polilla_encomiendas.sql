-- Polilla y encomiendas: reglas confirmadas con el dueño (paso 4).
-- - En la terminal el tiquete se hace por lo que pagó el pasajero: lo facturado
--   nunca supera lo cobrado (no hay sobrante negativo).
-- - Si el pasajero pasa por una terminal sin bajarse, facturar es obligatorio y
--   se hace en la primera que pasa. Si se baja en la siguiente, no se factura.
-- - Una encomienda va hacia adelante: el destino está después de donde se recibió.
-- Mismas reglas que lib/validaciones/registros.ts (la base es la última barrera).

alter table public.polilla_pasajeros
  add constraint polilla_facturado_no_supera_cobrado check (monto_facturado <= monto_cobrado),
  add constraint polilla_facturado_con_monto check (not facturado or monto_facturado > 0);

create or replace function private.validar_polilla()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_sentido text;
  v_orden smallint;
  v_orden_destino smallint;
  v_debe_facturar text;
begin
  select t.sentido into v_sentido from public.trayectos t where t.id = new.trayecto_id;
  select tr.orden into v_orden from public.tramos tr
    where tr.id = new.tramo_id and tr.sentido = v_sentido;
  if v_orden is null then
    raise exception 'El tramo % no pertenece al sentido del trayecto', new.tramo_id
      using errcode = 'check_violation';
  end if;

  select tr.orden into v_orden_destino from public.tramos tr
    where tr.sentido = v_sentido and tr.destino = new.destino and tr.orden >= v_orden;
  if v_orden_destino is null then
    raise exception 'Destino % inválido para el tramo %', new.destino, new.tramo_id
      using errcode = 'check_violation';
  end if;

  -- Primera terminal que pasa sin bajarse (null si se baja en la siguiente).
  if v_orden_destino > v_orden then
    select tr.origen into v_debe_facturar from public.tramos tr
      where tr.sentido = v_sentido and tr.orden = v_orden + 1;
  end if;

  if v_debe_facturar is not null
     and (not new.facturado or new.terminal_facturacion is distinct from v_debe_facturar) then
    raise exception 'El pasajero pasa por %: hay que facturarlo allí', v_debe_facturar
      using errcode = 'check_violation';
  end if;
  if v_debe_facturar is null and new.facturado then
    raise exception 'El pasajero se baja antes de la terminal: no se factura'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create function private.validar_encomienda()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_sentido text;
  v_orden smallint;
begin
  select t.sentido into v_sentido from public.trayectos t where t.id = new.trayecto_id;
  if new.recibida_en_terminal is not null then
    select tr.orden into v_orden from public.tramos tr
      where tr.sentido = v_sentido and tr.origen = new.recibida_en_terminal;
  else
    select tr.orden into v_orden from public.tramos tr
      where tr.sentido = v_sentido and tr.id = new.recibida_en_tramo;
  end if;
  if v_orden is null then
    raise exception 'Lugar de recibo inválido para este trayecto'
      using errcode = 'check_violation';
  end if;
  if not exists (
    select 1 from public.tramos tr
    where tr.sentido = v_sentido and tr.destino = new.destino and tr.orden >= v_orden
  ) then
    raise exception 'Destino % inválido: debe estar más adelante en la ruta', new.destino
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger encomiendas_validar before insert or update on public.encomiendas
  for each row execute function private.validar_encomienda();

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
