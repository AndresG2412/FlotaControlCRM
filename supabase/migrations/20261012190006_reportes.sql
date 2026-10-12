-- Reportes de dinero. SOLO ADMIN: la vista filtra por private.es_admin(), así un
-- conductor recibe 0 filas aunque la consulte directamente.
--
-- gastos_minimos = gastos_fijos + gastos_variables
-- liquidacion    = ingreso_real − gastos_minimos
-- Las varadas quedan en 0.

create view public.reporte_vueltas
with (security_invoker = true)
as
select
  v.id as vuelta_id,
  v.buseta_id,
  v.fecha_inicio,
  v.tipo,
  v.estado,
  v.conductor_florencia_id,
  v.conductor_pitalito_id,
  x.ingreso_planillas,
  x.ingreso_polilla,
  x.ingreso_encomiendas,
  x.ingreso_planillas + x.ingreso_polilla + x.ingreso_encomiendas as ingreso_real,
  x.quedo_conductor,
  x.gastos_fijos,
  x.gastos_variables,
  x.gastos_fijos + x.gastos_variables as gastos_minimos,
  (x.ingreso_planillas + x.ingreso_polilla + x.ingreso_encomiendas)
    - (x.gastos_fijos + x.gastos_variables) as liquidacion,
  (x.ingreso_planillas + x.ingreso_polilla + x.ingreso_encomiendas)
    - x.gastos_variables - x.gastos_fijos_en_ruta as efectivo_esperado,
  c.efectivo_entregado,
  c.efectivo_entregado
    - ((x.ingreso_planillas + x.ingreso_polilla + x.ingreso_encomiendas)
       - x.gastos_variables - x.gastos_fijos_en_ruta) as diferencia_cuadre,
  c.cerrado_en
from public.vueltas v
left join public.vuelta_cierres c on c.vuelta_id = v.id
cross join lateral (
  select
    case when v.tipo = 'varada' then 0 else coalesce((
      select sum(p.neto) from public.planillas p
      join public.trayectos t on t.id = p.trayecto_id
      where t.vuelta_id = v.id and p.estado = 'activa' and p.emitida
    ), 0) end::bigint as ingreso_planillas,
    case when v.tipo = 'varada' then 0 else coalesce((
      select sum(pp.sobrante) from public.polilla_pasajeros pp
      join public.trayectos t on t.id = pp.trayecto_id
      where t.vuelta_id = v.id and pp.estado = 'activo' and pp.destino_sobrante = 'polilla'
    ), 0) end::bigint as ingreso_polilla,
    case when v.tipo = 'varada' then 0 else coalesce((
      select sum(e.monto) from public.encomiendas e
      join public.trayectos t on t.id = e.trayecto_id
      where t.vuelta_id = v.id and e.estado = 'activa'
    ), 0) end::bigint as ingreso_encomiendas,
    case when v.tipo = 'varada' then 0 else coalesce((
      select sum(pp.sobrante) from public.polilla_pasajeros pp
      join public.trayectos t on t.id = pp.trayecto_id
      where t.vuelta_id = v.id and pp.estado = 'activo' and pp.destino_sobrante = 'conductor'
    ), 0) end::bigint as quedo_conductor,
    case when v.tipo = 'varada' then 0 else coalesce((
      select sum(f.valor) from public.vuelta_gastos_fijos f where f.vuelta_id = v.id
    ), 0) end::bigint as gastos_fijos,
    case when v.tipo = 'varada' then 0 else coalesce((
      select sum(f.valor) from public.vuelta_gastos_fijos f
      where f.vuelta_id = v.id and f.se_paga_en_ruta
    ), 0) end::bigint as gastos_fijos_en_ruta,
    case when v.tipo = 'varada' then 0 else coalesce((
      select sum(g.monto) from public.gastos_variables g
      where g.vuelta_id = v.id and g.estado = 'activo'
    ), 0) end::bigint as gastos_variables
) x
where (select private.es_admin());

revoke all on public.reporte_vueltas from anon, public;
grant select on public.reporte_vueltas to authenticated;
