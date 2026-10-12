-- Las validaciones de planilla y polilla deben leer trayectos/tramos sin depender
-- de RLS; si no, un usuario sin acceso recibe un error de validación engañoso en
-- lugar del rechazo de permisos. Solo leen catálogos y el sentido del trayecto.
alter function private.validar_planilla() security definer;
alter function private.validar_polilla() security definer;
