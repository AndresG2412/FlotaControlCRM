"use server";

import { revalidatePath } from "next/cache";
import { exigirRol } from "@/lib/auth/sesion";
import { accionesAdmin, esEstadoVuelta } from "@/lib/dominio/vuelta";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import {
  esquemaCorreccionPlanilla,
  esquemaDatosVuelta,
  esquemaIdVuelta,
  type CorreccionPlanilla,
  type DatosVuelta,
} from "@/lib/validaciones/admin";
import { esquemaAnulacion, esquemaPlanilla } from "@/lib/validaciones/registros";

// Acciones del admin sobre vueltas y planillas. Cada una verifica el rol, valida
// con Zod y escribe con la sesión del admin (la RLS y los checks son la última
// barrera). El cierre con cuadre (cerrar_vuelta) es del paso 5.

export type Resultado = { error: string | null };

type Cliente = Awaited<ReturnType<typeof crearClienteServidor>>;

const primerMensaje = (issues: { message: string }[]) => issues[0]?.message ?? "Datos inválidos";

function revalidar(vueltaId: string) {
  revalidatePath("/admin/vueltas");
  revalidatePath(`/admin/vueltas/${vueltaId}`);
}

/** Estado de la vuelta; si está cerrada no se edita (solo lectura). */
async function vueltaEditable(supabase: Cliente, vueltaId: string): Promise<string | null> {
  const { data } = await supabase.from("vueltas").select("estado").eq("id", vueltaId).maybeSingle();
  if (!data || !esEstadoVuelta(data.estado)) return "La vuelta no existe";
  if (!accionesAdmin(data.estado).editar) return "La vuelta está cerrada: solo lectura";
  return null;
}

/** Planilla vigente con su trayecto (para saber el sentido y la vuelta). */
async function leerPlanilla(supabase: Cliente, id: string) {
  const { data } = await supabase
    .from("planillas")
    .select("id, trayecto_id, terminal, ocurrido_en, foto_path, estado, trayectos ( vuelta_id, sentido )")
    .eq("id", id)
    .maybeSingle();
  if (!data || !data.trayectos || data.estado !== "activa") return null;
  return data;
}

/** Corrige los datos digitados de una planilla. Quién corrigió lo guarda la base. */
export async function corregirPlanilla(entrada: CorreccionPlanilla): Promise<Resultado> {
  await exigirRol("admin");
  const parcial = esquemaCorreccionPlanilla.safeParse(entrada);
  if (!parcial.success) return { error: primerMensaje(parcial.error.issues) };

  const supabase = await crearClienteServidor();
  const actual = await leerPlanilla(supabase, parcial.data.id);
  if (!actual?.trayectos) return { error: "La planilla no existe o fue eliminada" };
  const bloqueo = await vueltaEditable(supabase, actual.trayectos.vuelta_id);
  if (bloqueo) return { error: bloqueo };

  // Se valida la planilla completa con el mismo esquema del conductor.
  const c = parcial.data;
  const completa = esquemaPlanilla.safeParse({
    id: actual.id,
    ocurrido_en: new Date(actual.ocurrido_en).toISOString(),
    trayecto_id: actual.trayecto_id,
    sentido: actual.trayectos.sentido,
    terminal: actual.terminal,
    foto_path: actual.foto_path,
    emitida: c.emitida,
    neto: c.emitida ? c.neto : null,
    numero: c.emitida ? c.numero || null : null,
    pasajeros: c.emitida ? c.pasajeros : null,
    motivo_sin_planilla: c.emitida ? null : c.motivo_sin_planilla || null,
  });
  if (!completa.success) return { error: primerMensaje(completa.error.issues) };

  const p = completa.data;
  const { data, error } = await supabase
    .from("planillas")
    .update({
      emitida: p.emitida,
      neto: p.neto ?? null,
      numero: p.numero ?? null,
      pasajeros: p.pasajeros ?? null,
      motivo_sin_planilla: p.motivo_sin_planilla ?? null,
    })
    .eq("id", p.id)
    .eq("estado", "activa")
    .select("id");
  if (error || !data.length) return { error: "No se pudo guardar la corrección" };

  revalidar(actual.trayectos.vuelta_id);
  return { error: null };
}

/** "Eliminar" una planilla: queda anulada con su motivo (no hay borrado físico). */
export async function anularPlanilla(entrada: { id: string; motivo_anulacion: string }): Promise<Resultado> {
  await exigirRol("admin");
  const datos = esquemaAnulacion.strict().safeParse(entrada);
  if (!datos.success) return { error: primerMensaje(datos.error.issues) };

  const supabase = await crearClienteServidor();
  const actual = await leerPlanilla(supabase, datos.data.id);
  if (!actual?.trayectos) return { error: "La planilla no existe o ya fue eliminada" };
  const bloqueo = await vueltaEditable(supabase, actual.trayectos.vuelta_id);
  if (bloqueo) return { error: bloqueo };

  const { data, error } = await supabase
    .from("planillas")
    .update({ estado: "anulada", motivo_anulacion: datos.data.motivo_anulacion })
    .eq("id", datos.data.id)
    .eq("estado", "activa")
    .select("id");
  if (error || !data.length) return { error: "No se pudo eliminar la planilla" };

  revalidar(actual.trayectos.vuelta_id);
  return { error: null };
}

/**
 * Conductores y tipo de la vuelta. Al cambiar el tipo, la base recarga los gastos
 * fijos (una varada queda sin gastos).
 */
export async function actualizarVuelta(entrada: DatosVuelta): Promise<Resultado> {
  await exigirRol("admin");
  const datos = esquemaDatosVuelta.safeParse(entrada);
  if (!datos.success) return { error: primerMensaje(datos.error.issues) };
  const v = datos.data;

  const supabase = await crearClienteServidor();
  const bloqueo = await vueltaEditable(supabase, v.id);
  if (bloqueo) return { error: bloqueo };

  // Solo conductores activos pueden ir en un puesto.
  const ids = [v.conductor_florencia_id, v.conductor_pitalito_id].filter((x): x is string => x !== null);
  const { data: conductores } = await supabase
    .from("perfiles")
    .select("id")
    .in("id", ids)
    .eq("rol", "conductor")
    .eq("activo", true);
  if ((conductores?.length ?? 0) !== ids.length) return { error: "Elige conductores activos" };

  const { data, error } = await supabase
    .from("vueltas")
    .update({
      tipo: v.tipo,
      conductor_florencia_id: v.conductor_florencia_id,
      conductor_pitalito_id: v.conductor_pitalito_id,
    })
    .eq("id", v.id)
    .neq("estado", "cerrada")
    .select("id");
  if (error || !data.length) return { error: "No se pudo guardar la vuelta" };

  revalidar(v.id);
  return { error: null };
}

/** Reabre una vuelta finalizada. La base impide tener dos en curso por buseta. */
export async function reabrirVuelta(entrada: { id: string }): Promise<Resultado> {
  await exigirRol("admin");
  const datos = esquemaIdVuelta.safeParse(entrada);
  if (!datos.success) return { error: "Datos inválidos" };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("vueltas")
    .update({ estado: "en_curso" })
    .eq("id", datos.data.id)
    .eq("estado", "finalizada")
    .select("id");

  if (error?.code === "23505" && error.message.includes("vueltas_una_en_curso")) {
    return { error: "Ya hay otra vuelta en curso en esta buseta. Hay que finalizarla antes de reabrir esta." };
  }
  if (error) return { error: "No se pudo reabrir la vuelta" };
  if (!data.length) return { error: "Solo se puede reabrir una vuelta finalizada" };

  revalidar(datos.data.id);
  return { error: null };
}

/**
 * "Eliminar" un pasajero de vía o una encomienda: queda anulado con su motivo
 * (no hay borrado físico). Solo si la vuelta no está cerrada.
 */
async function anularDePolilla(
  tabla: "polilla_pasajeros" | "encomiendas",
  entrada: { id: string; motivo_anulacion: string },
): Promise<Resultado> {
  await exigirRol("admin");
  const datos = esquemaAnulacion.strict().safeParse(entrada);
  if (!datos.success) return { error: primerMensaje(datos.error.issues) };

  const supabase = await crearClienteServidor();
  const activo = tabla === "polilla_pasajeros" ? "activo" : "activa";
  const anulado = tabla === "polilla_pasajeros" ? "anulado" : "anulada";

  const { data: actual } = await supabase
    .from(tabla)
    .select("id, estado, trayectos ( vuelta_id )")
    .eq("id", datos.data.id)
    .maybeSingle();
  if (!actual?.trayectos || actual.estado !== activo) return { error: "El registro no existe o ya fue eliminado" };
  const bloqueo = await vueltaEditable(supabase, actual.trayectos.vuelta_id);
  if (bloqueo) return { error: bloqueo };

  const { data, error } = await supabase
    .from(tabla)
    .update({ estado: anulado, motivo_anulacion: datos.data.motivo_anulacion })
    .eq("id", datos.data.id)
    .eq("estado", activo)
    .select("id");
  if (error || !data.length) return { error: "No se pudo eliminar" };

  revalidar(actual.trayectos.vuelta_id);
  return { error: null };
}

export async function anularPasajero(entrada: { id: string; motivo_anulacion: string }): Promise<Resultado> {
  return anularDePolilla("polilla_pasajeros", entrada);
}

export async function anularEncomienda(entrada: { id: string; motivo_anulacion: string }): Promise<Resultado> {
  return anularDePolilla("encomiendas", entrada);
}
