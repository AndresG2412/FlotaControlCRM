import "server-only";
import { exigirRol } from "@/lib/auth/sesion";
import { esEstadoVuelta, esTipoVuelta } from "@/lib/dominio/vuelta";
import type { FilaReporte, QuedoRegistro } from "@/lib/dominio/reportes";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { nombres } from "./comun";

// Datos de los reportes (solo admin). Los montos por vuelta salen de la vista
// reporte_vueltas (0 filas para quien no es admin); lo que "se quedó el
// conductor" por persona sale de la polilla (quién lo registró).

export type DatosReporte = {
  filas: FilaReporte[];
  quedos: QuedoRegistro[];
  nombres: Record<string, string>;
};

/** Vueltas entre dos días (inclusive, días de Bogotá de fecha_inicio). */
export async function datosReporte(desde: string, hasta: string): Promise<DatosReporte> {
  await exigirRol("admin");
  const supabase = await crearClienteServidor();

  const [reporte, polilla, mapa] = await Promise.all([
    supabase
      .from("reporte_vueltas")
      .select(
        "vuelta_id, fecha_inicio, tipo, estado, conductor_florencia_id, conductor_pitalito_id, ingreso_real, gastos_fijos, gastos_variables, liquidacion, quedo_conductor, diferencia_cuadre",
      )
      .gte("fecha_inicio", desde)
      .lte("fecha_inicio", hasta)
      .order("fecha_inicio", { ascending: false }),
    supabase
      .from("polilla_pasajeros")
      .select("registrado_por, sobrante, trayectos!inner ( vueltas!inner ( fecha_inicio, tipo, estado ) )")
      .eq("estado", "activo")
      .eq("destino_sobrante", "conductor")
      .eq("trayectos.vueltas.tipo", "completa") // una varada queda en $0
      .neq("trayectos.vueltas.estado", "en_curso")
      .gte("trayectos.vueltas.fecha_inicio", desde)
      .lte("trayectos.vueltas.fecha_inicio", hasta),
    nombres(supabase),
  ]);
  if (reporte.error || polilla.error) throw new Error("No se pudieron leer los reportes");

  const filas = reporte.data.flatMap((r): FilaReporte[] => {
    if (!r.vuelta_id || !r.fecha_inicio || !r.tipo || !r.estado || !esTipoVuelta(r.tipo) || !esEstadoVuelta(r.estado)) return [];
    return [
      {
        vuelta_id: r.vuelta_id,
        fecha_inicio: r.fecha_inicio,
        tipo: r.tipo,
        estado: r.estado,
        conductor_florencia_id: r.conductor_florencia_id,
        conductor_pitalito_id: r.conductor_pitalito_id,
        ingreso_real: r.ingreso_real ?? 0,
        gastos_fijos: r.gastos_fijos ?? 0,
        gastos_variables: r.gastos_variables ?? 0,
        liquidacion: r.liquidacion ?? 0,
        quedo_conductor: r.quedo_conductor ?? 0,
        diferencia_cuadre: r.diferencia_cuadre,
      },
    ];
  });

  return {
    filas,
    quedos: polilla.data.map((p) => ({ registrado_por: p.registrado_por, sobrante: p.sobrante ?? 0 })),
    nombres: Object.fromEntries(mapa),
  };
}
