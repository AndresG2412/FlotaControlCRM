-- Paso 5: reglas del cierre de la vuelta.
-- - Solo se cierra una vuelta finalizada (una varada también se finaliza antes).
-- - El admin puede reabrir una cerrada con motivo; el cuadre anterior se guarda
--   en vuelta_cierres_reemplazados (no hay borrado de historial).
-- - Una vuelta cerrada es de solo lectura también en gastos fijos y variables.
-- - Se registra quién ajustó un gasto fijo de una vuelta.

create or replace function public.cerrar_vuelta(p_vuelta uuid, p_efectivo_entregado bigint, p_notas text default null)
returns void
language plpgsql set search_path = ''
as $$
declare
  v_estado text;
begin
  if not private.es_admin() then
    raise exception 'Solo el administrador puede cerrar vueltas' using errcode = 'insufficient_privilege';
  end if;

  select estado into v_estado from public.vueltas where id = p_vuelta for update;
  if not found then
    raise exception 'Vuelta no encontrada' using errcode = 'no_data_found';
  end if;
  if v_estado <> 'finalizada' then
    raise exception 'Solo se puede cerrar una vuelta finalizada' using errcode = 'check_violation';
  end if;

  insert into public.vuelta_cierres (vuelta_id, efectivo_entregado, notas, cerrado_por, cerrado_en)
  values (p_vuelta, p_efectivo_entregado, p_notas, auth.uid(), now())
  on conflict (vuelta_id) do update
    set efectivo_entregado = excluded.efectivo_entregado,
        notas = excluded.notas,
        cerrado_por = excluded.cerrado_por,
        cerrado_en = excluded.cerrado_en;

  update public.vueltas set estado = 'cerrada' where id = p_vuelta;
end;
$$;

-- Cuadres reemplazados al reabrir una vuelta cerrada. Solo admin; lo escribe la función.
create table public.vuelta_cierres_reemplazados (
  id uuid primary key default gen_random_uuid(),
  vuelta_id uuid not null references public.vueltas (id),
  efectivo_entregado bigint not null,
  notas text,
  cerrado_por uuid references public.perfiles (id),
  cerrado_en timestamptz,
  reabierto_por uuid not null references public.perfiles (id),
  reabierto_en timestamptz not null default now(),
  motivo text not null check (char_length(motivo) between 3 and 300)
);
alter table public.vuelta_cierres_reemplazados enable row level security;
create index vuelta_cierres_reemplazados_vuelta on public.vuelta_cierres_reemplazados (vuelta_id);
create index vuelta_cierres_reemplazados_cerrado_por on public.vuelta_cierres_reemplazados (cerrado_por);
create index vuelta_cierres_reemplazados_reabierto_por on public.vuelta_cierres_reemplazados (reabierto_por);

create policy vuelta_cierres_reemplazados_select on public.vuelta_cierres_reemplazados for select to authenticated
  using ((select private.es_admin()));

-- Cerrada → finalizada, guardando el cuadre anterior. Security definer porque la
-- tabla de cierres no tiene política de DELETE; el rol se verifica adentro.
create function public.reabrir_vuelta_cerrada(p_vuelta uuid, p_motivo text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_estado text;
begin
  if not private.es_admin() then
    raise exception 'Solo el administrador puede reabrir una vuelta cerrada' using errcode = 'insufficient_privilege';
  end if;
  if p_motivo is null or char_length(btrim(p_motivo)) < 3 or char_length(p_motivo) > 300 then
    raise exception 'El motivo debe tener entre 3 y 300 caracteres' using errcode = 'check_violation';
  end if;

  select estado into v_estado from public.vueltas where id = p_vuelta for update;
  if not found then
    raise exception 'Vuelta no encontrada' using errcode = 'no_data_found';
  end if;
  if v_estado <> 'cerrada' then
    raise exception 'Solo se puede reabrir una vuelta cerrada' using errcode = 'check_violation';
  end if;

  insert into public.vuelta_cierres_reemplazados
    (vuelta_id, efectivo_entregado, notas, cerrado_por, cerrado_en, reabierto_por, motivo)
  select c.vuelta_id, c.efectivo_entregado, c.notas, c.cerrado_por, c.cerrado_en, auth.uid(), btrim(p_motivo)
  from public.vuelta_cierres c where c.vuelta_id = p_vuelta;

  delete from public.vuelta_cierres where vuelta_id = p_vuelta;
  update public.vueltas set estado = 'finalizada' where id = p_vuelta;
end;
$$;

-- Una vuelta cerrada es de solo lectura también para el admin.
create function private.bloquear_si_vuelta_cerrada()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if exists (select 1 from public.vueltas v where v.id = new.vuelta_id and v.estado = 'cerrada') then
    raise exception 'La vuelta está cerrada: solo lectura' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger vuelta_gastos_fijos_cerrada before update on public.vuelta_gastos_fijos
  for each row execute function private.bloquear_si_vuelta_cerrada();
create trigger gastos_variables_cerrada before insert or update on public.gastos_variables
  for each row execute function private.bloquear_si_vuelta_cerrada();

-- Quién ajustó el valor de un gasto fijo de una vuelta.
alter table public.vuelta_gastos_fijos
  add column actualizado_en timestamptz,
  add column actualizado_por uuid references public.perfiles (id);
create index vuelta_gastos_fijos_actualizado_por on public.vuelta_gastos_fijos (actualizado_por);

create function private.marcar_ajuste_gasto_fijo()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  -- Solo se puede cambiar el valor y si se paga en ruta; el resto queda igual.
  new.vuelta_id := old.vuelta_id;
  new.concepto := old.concepto;
  new.actualizado_en := now();
  new.actualizado_por := auth.uid();
  return new;
end;
$$;

create trigger vuelta_gastos_fijos_ajuste before update on public.vuelta_gastos_fijos
  for each row execute function private.marcar_ajuste_gasto_fijo();

revoke all on function public.cerrar_vuelta(uuid, bigint, text) from public, anon;
grant execute on function public.cerrar_vuelta(uuid, bigint, text) to authenticated;
revoke all on function public.reabrir_vuelta_cerrada(uuid, text) from public, anon;
grant execute on function public.reabrir_vuelta_cerrada(uuid, text) to authenticated;
revoke all on function private.bloquear_si_vuelta_cerrada() from public, anon;
revoke all on function private.marcar_ajuste_gasto_fijo() from public, anon;
revoke all on public.vuelta_cierres_reemplazados from anon, public;
grant select on public.vuelta_cierres_reemplazados to authenticated;
