-- Los dos conductores de una vuelta comparten los registros de esa vuelta:
-- ambos ven y pueden corregir planillas, polilla, encomiendas y gastos variables
-- mientras la vuelta no esté cerrada. registrado_por conserva al autor original
-- y actualizado_por queda con quien corrigió.
-- Siguen sin ver totales: gastos fijos, cierres y reporte_vueltas son solo admin.

create function private.asignado_a_trayecto(p_trayecto uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.asignado_a_vuelta(private.vuelta_de_trayecto(p_trayecto))
$$;

-- Planillas
drop policy planillas_select on public.planillas;
drop policy planillas_update on public.planillas;
create policy planillas_select on public.planillas for select to authenticated
  using ((select private.es_admin()) or private.asignado_a_trayecto(trayecto_id));
create policy planillas_update on public.planillas for update to authenticated
  using ((select private.es_admin()) or private.puede_registrar_en_trayecto(trayecto_id))
  with check ((select private.es_admin()) or private.puede_registrar_en_trayecto(trayecto_id));

-- Polilla
drop policy polilla_select on public.polilla_pasajeros;
drop policy polilla_update on public.polilla_pasajeros;
create policy polilla_select on public.polilla_pasajeros for select to authenticated
  using ((select private.es_admin()) or private.asignado_a_trayecto(trayecto_id));
create policy polilla_update on public.polilla_pasajeros for update to authenticated
  using ((select private.es_admin()) or private.puede_registrar_en_trayecto(trayecto_id))
  with check ((select private.es_admin()) or private.puede_registrar_en_trayecto(trayecto_id));

-- Encomiendas
drop policy encomiendas_select on public.encomiendas;
drop policy encomiendas_update on public.encomiendas;
create policy encomiendas_select on public.encomiendas for select to authenticated
  using ((select private.es_admin()) or private.asignado_a_trayecto(trayecto_id));
create policy encomiendas_update on public.encomiendas for update to authenticated
  using ((select private.es_admin()) or private.puede_registrar_en_trayecto(trayecto_id))
  with check ((select private.es_admin()) or private.puede_registrar_en_trayecto(trayecto_id));

-- Gastos variables
drop policy gastos_variables_select on public.gastos_variables;
drop policy gastos_variables_update on public.gastos_variables;
create policy gastos_variables_select on public.gastos_variables for select to authenticated
  using ((select private.es_admin()) or private.asignado_a_vuelta(vuelta_id));
create policy gastos_variables_update on public.gastos_variables for update to authenticated
  using ((select private.es_admin()) or private.puede_registrar_en_vuelta(vuelta_id))
  with check ((select private.es_admin()) or private.puede_registrar_en_vuelta(vuelta_id));

-- Los usuarios activos pueden ver nombre y rol de los demás (para mostrar quién registró).
drop policy perfiles_select on public.perfiles;
create policy perfiles_select on public.perfiles for select to authenticated
  using (id = (select auth.uid()) or (select private.es_usuario_activo()));

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
