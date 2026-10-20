// Trae del servidor lo que el conductor necesita tener en el celular: la vuelta
// en curso con sus trayectos, planillas, pasajeros de vía, encomiendas y gastos
// variables; el historial de repuestos con sus categorías; la buseta y los
// usuarios. Lectura con la sesión del usuario (RLS). Nunca pisa lo que aún no se ha enviado.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/tipos";
import type { BaseLocal, RegistroLocal } from "./db";
import { idsSinSincronizar } from "./cola";
import { hoyEnBogota, sumarDias } from "@/lib/dominio/fechas";
import type { FilaSalida } from "@/lib/dominio/programacion";
import type { Tabla } from "./operaciones";

export const AJUSTE_BUSETAS = "busetas";
export const AJUSTE_CONDUCTORES = "conductores";
export const AJUSTE_ULTIMA_DESCARGA = "ultimaDescarga";
export const AJUSTE_CATEGORIAS = "categoriasRepuestos";
/** Nombres de todos los usuarios (para mostrar quién registró un repuesto). */
export const AJUSTE_PERSONAS = "personas";
/** Programación cercana (salidas) y vencimientos, para la Agenda sin señal. */
export const AJUSTE_PROGRAMACION = "programacion";
export const AJUSTE_VENCIMIENTOS = "vencimientos";

/** Días de programación que se guardan: un poco atrás (regresos) y un mes adelante. */
const DIAS_ATRAS = 10;
const DIAS_ADELANTE = 45;

/** Repuestos que se guardan en el celular para consultar el historial sin señal. */
const MAX_REPUESTOS = 300;

export type BusetaCache = { id: string; placa: string; numero_interno: string | null };
export type ConductorCache = { id: string; nombre: string };
export type CategoriaCache = { id: number; nombre: string; activa: boolean };
export type VencimientoCache = {
  id: string;
  nombre: string;
  fecha_pago: string;
  fecha_recordatorio: string | null;
  fecha_vencimiento: string | null;
};

type Cliente = SupabaseClient<Database>;

export async function descargar(db: BaseLocal, supabase: Cliente): Promise<void> {
  // Vueltas en curso más las que el celular ya tenía (para ver si se finalizaron o cerraron).
  const locales = (await db.registros.where("tabla").equals("vueltas").toArray()).map((r) => r.id);
  const filtro = locales.length ? `estado.eq.en_curso,id.in.(${locales.join(",")})` : "estado.eq.en_curso";

  const hoy = hoyEnBogota();
  const [vueltas, busetas, conductores, personas, categorias, repuestos, programacion, vencimientos] = await Promise.all([
    supabase.from("vueltas").select("*").or(filtro),
    supabase.from("busetas").select("id, placa, numero_interno").eq("activa", true),
    supabase.from("perfiles").select("id, nombre").eq("rol", "conductor").eq("activo", true).order("nombre"),
    supabase.from("perfiles").select("id, nombre"),
    supabase.from("repuesto_categorias").select("id, nombre, activa").order("id"),
    // Historial compartido de la buseta (todos lo ven), más recientes primero.
    supabase
      .from("repuestos")
      .select("*")
      .order("fecha_cambio", { ascending: false })
      .order("ocurrido_en", { ascending: false })
      .limit(MAX_REPUESTOS),
    supabase
      .from("programacion_salidas")
      .select("id, fecha, hora, sentido, tipo, estado, cancelada_por_id")
      .gte("fecha", sumarDias(hoy, -DIAS_ATRAS))
      .lte("fecha", sumarDias(hoy, DIAS_ADELANTE))
      .order("fecha"),
    // Solo nombre y fechas: la función no expone costos ni comprobantes.
    supabase.rpc("vencimientos_buseta"),
  ]);
  if (
    vueltas.error || busetas.error || conductores.error || personas.error || categorias.error || repuestos.error ||
    programacion.error || vencimientos.error
  ) {
    throw new Error("No se pudo descargar");
  }

  const idsVueltas = vueltas.data.map((v) => v.id);
  const trayectos = idsVueltas.length
    ? await supabase.from("trayectos").select("*").in("vuelta_id", idsVueltas)
    : { data: [], error: null };
  if (trayectos.error) throw new Error("No se pudo descargar");

  const idsTrayectos = trayectos.data.map((t) => t.id);
  const vacio = { data: [], error: null };
  const gastos = idsVueltas.length
    ? await supabase.from("gastos_variables").select("*").in("vuelta_id", idsVueltas)
    : vacio;
  if (gastos.error) throw new Error("No se pudo descargar");
  const [planillas, pasajeros, encomiendas] = idsTrayectos.length
    ? await Promise.all([
        supabase.from("planillas").select("*").in("trayecto_id", idsTrayectos),
        supabase.from("polilla_pasajeros").select("*").in("trayecto_id", idsTrayectos),
        supabase.from("encomiendas").select("*").in("trayecto_id", idsTrayectos),
      ])
    : [vacio, vacio, vacio];
  if (planillas.error || pasajeros.error || encomiendas.error) throw new Error("No se pudo descargar");

  const pendientes = await idsSinSincronizar(db);
  const ahora = new Date().toISOString();
  const aRegistro = (tabla: Tabla, fila: { id: string; estado?: string }): RegistroLocal => ({
    id: fila.id,
    tabla,
    datos: fila,
    anulado: fila.estado === "anulada" || fila.estado === "anulado",
    actualizadoEn: ahora,
  });

  const nuevos = [
    ...vueltas.data.map((v) => aRegistro("vueltas", v)),
    ...trayectos.data.map((t) => aRegistro("trayectos", t)),
    ...planillas.data.map((p) => aRegistro("planillas", p)),
    ...pasajeros.data.map((p) => aRegistro("polilla_pasajeros", p)),
    ...encomiendas.data.map((e) => aRegistro("encomiendas", e)),
    ...gastos.data.map((g) => aRegistro("gastos_variables", g)),
    ...repuestos.data.map((r) => aRegistro("repuestos", r)),
  ].filter((r) => !pendientes.has(r.id)); // lo local sin enviar manda

  await db.transaction("rw", db.registros, db.ajustes, async () => {
    // Vueltas locales ya enviadas que el servidor no devolvió: ya no son visibles.
    const visibles = new Set(idsVueltas);
    const sobran = locales.filter((id) => !visibles.has(id) && !pendientes.has(id));
    await db.registros.bulkDelete(sobran);
    await db.registros.bulkPut(nuevos);
    await db.ajustes.bulkPut([
      { clave: AJUSTE_BUSETAS, valor: busetas.data satisfies BusetaCache[] },
      { clave: AJUSTE_CONDUCTORES, valor: conductores.data satisfies ConductorCache[] },
      { clave: AJUSTE_PERSONAS, valor: personas.data satisfies ConductorCache[] },
      { clave: AJUSTE_CATEGORIAS, valor: categorias.data satisfies CategoriaCache[] },
      { clave: AJUSTE_PROGRAMACION, valor: programacion.data satisfies FilaSalida[] },
      {
        clave: AJUSTE_VENCIMIENTOS,
        valor: vencimientos.data.map(({ id, nombre, fecha_pago, fecha_recordatorio, fecha_vencimiento }) => ({
          id, nombre, fecha_pago, fecha_recordatorio, fecha_vencimiento,
        })) satisfies VencimientoCache[],
      },
      { clave: AJUSTE_ULTIMA_DESCARGA, valor: ahora },
    ]);
  });
}
