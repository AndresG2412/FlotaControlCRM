-- Permisos de los conductores confirmados con el dueño:
-- - Cualquier conductor crea la vuelta, pero solo puede haber una en curso por
--   buseta (índice vueltas_una_en_curso): hay que finalizarla para empezar otra.
--   Por eso todo conductor ve la vuelta en curso de la buseta y puede unirse a
--   ella (o reemplazar a un compañero) con unirse_a_vuelta().
-- - Repuestos: todos los usuarios activos ven el historial; cada conductor edita
--   o anula (no hay borrado físico) los que registró.
-- - Pagos y vencimientos: los conductores ven cuándo vence cada uno (SOAT,
--   seguro, tecnomecánica), sin costos ni comprobantes, con vencimientos_buseta().

-- ---------------------------------------------------------------------------
-- Vueltas
-- ---------------------------------------------------------------------------
drop policy vueltas_select on public.vueltas;
create policy vueltas_select on public.vueltas for select to authenticated
  using (
    (select private.es_admin())
    or ((select private.es_conductor())
        and (estado = 'en_curso'
             or (select auth.uid()) in (conductor_florencia_id, conductor_pitalito_id)))
  );

create function public.unirse_a_vuelta(p_vuelta uuid, p_puesto text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.es_conductor() then
    raise exception 'Solo un conductor puede unirse a una vuelta'
      using errcode = 'insufficient_privilege';
  end if;
  if p_puesto not in ('florencia', 'pitalito') then
    raise exception 'Puesto inválido: %', p_puesto using errcode = 'check_violation';
  end if;

  if p_puesto = 'florencia' then
    update public.vueltas
      set conductor_florencia_id = auth.uid(),
          conductor_pitalito_id = case when conductor_pitalito_id = auth.uid()
                                       then null else conductor_pitalito_id end
      where id = p_vuelta and estado = 'en_curso';
  else
    update public.vueltas
      set conductor_pitalito_id = auth.uid(),
          conductor_florencia_id = case when conductor_florencia_id = auth.uid()
                                        then null else conductor_florencia_id end
      where id = p_vuelta and estado = 'en_curso';
  end if;

  if not found then
    raise exception 'La vuelta no existe o ya terminó' using errcode = 'no_data_found';
  end if;
end;
$$;

revoke all on function public.unirse_a_vuelta(uuid, text) from public, anon;
grant execute on function public.unirse_a_vuelta(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Repuestos: historial compartido
-- ---------------------------------------------------------------------------
drop policy repuestos_select on public.repuestos;
create policy repuestos_select on public.repuestos for select to authenticated
  using ((select private.es_usuario_activo()));

-- ---------------------------------------------------------------------------
-- Vencimientos visibles para todos, sin dinero
-- ---------------------------------------------------------------------------
-- Último pago activo de cada concepto (al renovar se registra un pago nuevo).
create function public.vencimientos_buseta()
returns table (
  id uuid,
  buseta_id uuid,
  nombre text,
  fecha_pago date,
  fecha_recordatorio date,
  fecha_vencimiento date
)
language sql stable security definer set search_path = ''
as $$
  select distinct on (p.buseta_id, lower(p.nombre))
    p.id, p.buseta_id, p.nombre, p.fecha_pago, p.fecha_recordatorio, p.fecha_vencimiento
  from public.pagos_periodicos p
  where p.estado = 'activo' and private.es_usuario_activo()
  order by p.buseta_id, lower(p.nombre), p.fecha_pago desc, p.creado_en desc
$$;

revoke all on function public.vencimientos_buseta() from public, anon;
grant execute on function public.vencimientos_buseta() to authenticated;
