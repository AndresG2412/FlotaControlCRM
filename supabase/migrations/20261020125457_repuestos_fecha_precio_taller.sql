-- Repuestos (pedido del dueño):
-- - Fecha del cambio elegible: por defecto hoy, se puede poner un día anterior,
--   nunca uno futuro. Va en fecha_cambio (día de Bogotá); ocurrido_en sigue siendo
--   la hora en que se registró en el celular (para detectar horas raras).
-- - Sin kilometraje (no se usaba: 0 filas con valor).
-- - Precio y taller obligatorios.

alter table public.repuestos add column fecha_cambio date;

update public.repuestos
  set fecha_cambio = (ocurrido_en at time zone 'America/Bogota')::date;

alter table public.repuestos
  alter column fecha_cambio set not null,
  alter column fecha_cambio set default ((now() at time zone 'America/Bogota')::date),
  drop column kilometraje,
  add constraint repuestos_costo_obligatorio check (costo is not null and costo > 0),
  add constraint repuestos_taller_obligatorio check (taller is not null and char_length(btrim(taller)) between 1 and 120);

drop index if exists public.repuestos_historial;
create index repuestos_historial on public.repuestos (buseta_id, categoria_id, fecha_cambio desc);

-- La fecha del cambio no puede ser futura (día de Bogotá). Va en trigger porque
-- depende de la fecha actual; solo se revisa al crear o al cambiar la fecha.
create function private.validar_fecha_repuesto()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if (tg_op = 'INSERT' or new.fecha_cambio is distinct from old.fecha_cambio)
     and new.fecha_cambio > (now() at time zone 'America/Bogota')::date then
    raise exception 'La fecha del cambio no puede ser futura' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger repuestos_validar_fecha before insert or update on public.repuestos
  for each row execute function private.validar_fecha_repuesto();

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
