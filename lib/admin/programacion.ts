import "server-only";
import { exigirRol } from "@/lib/auth/sesion";
import { rangoDelMes, sumarDias } from "@/lib/dominio/fechas";
import { salidaDesdeFila, type Salida } from "@/lib/dominio/programacion";
import { esSentido, type Sentido } from "@/lib/dominio/ruta";
import { crearClienteServidor } from "@/lib/supabase/servidor";

// Programación de salidas para el panel del admin. Cada función exportada
// verifica el rol (AUTZ-6). Los regresos, ventanas y disponibilidad se calculan
// con las funciones puras de lib/dominio/programacion.

/** Días antes y después del mes que se leen para no cortar ventanas de regreso. */
const MARGEN_DIAS = 10;

export type SalidaAdmin = Salida & { notas: string | null };

export type TrayectoSinSalida = {
  id: string;
  vuelta_id: string;
  sentido: Sentido;
  fecha: string;
  hora_salida: string | null;
};

export type DatosProgramacion = {
  busetaId: string | null;
  placa: string | null;
  /** Salidas del mes con margen (para calcular ventanas y regresos). */
  salidas: SalidaAdmin[];
  /** Trayectos del mes que no quedaron enlazados a una salida (día no programado o regreso corrido). */
  trayectosSinSalida: TrayectoSinSalida[];
};

export async function datosProgramacion(mes: string): Promise<DatosProgramacion> {
  await exigirRol("admin");
  const supabase = await crearClienteServidor();
  const { desde, hasta } = rangoDelMes(mes);

  const { data: buseta } = await supabase
    .from("busetas")
    .select("id, placa")
    .eq("activa", true)
    .order("creado_en")
    .limit(1)
    .maybeSingle();
  if (!buseta) return { busetaId: null, placa: null, salidas: [], trayectosSinSalida: [] };

  const [salidas, trayectos] = await Promise.all([
    supabase
      .from("programacion_salidas")
      .select("id, fecha, hora, sentido, tipo, estado, cancelada_por_id, notas")
      .eq("buseta_id", buseta.id)
      .gte("fecha", sumarDias(desde, -MARGEN_DIAS))
      .lte("fecha", sumarDias(hasta, MARGEN_DIAS))
      .order("fecha")
      .order("hora", { nullsFirst: false }),
    supabase
      .from("trayectos")
      .select("id, vuelta_id, sentido, fecha, hora_salida, vueltas!inner ( buseta_id )")
      .is("salida_programada_id", null)
      .eq("vueltas.buseta_id", buseta.id)
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .order("fecha"),
  ]);
  if (salidas.error || trayectos.error) throw new Error("No se pudo leer la programación");

  return {
    busetaId: buseta.id,
    placa: buseta.placa,
    salidas: salidas.data.flatMap((f) => {
      const s = salidaDesdeFila(f);
      return s ? [{ ...s, notas: f.notas }] : [];
    }),
    trayectosSinSalida: trayectos.data.flatMap((t) =>
      esSentido(t.sentido)
        ? [{ id: t.id, vuelta_id: t.vuelta_id, sentido: t.sentido, fecha: t.fecha, hora_salida: t.hora_salida }]
        : [],
    ),
  };
}
