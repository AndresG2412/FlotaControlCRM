"use server";

import { revalidatePath } from "next/cache";
import { exigirRol } from "@/lib/auth/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import {
  esquemaAdicional,
  esquemaCancelarSalida,
  esquemaEditarSalida,
  esquemaEnlazarTrayecto,
  esquemaSalida,
  type AdicionalEntrada,
  type EditarSalida,
  type SalidaEntrada,
} from "@/lib/validaciones/admin";

// Acciones del admin sobre la programación. Cada una verifica el rol, valida con
// Zod y escribe con la sesión del admin. Las salidas nunca se borran: se cancelan.

export type Resultado = { error: string | null };

type Cliente = Awaited<ReturnType<typeof crearClienteServidor>>;

const primerMensaje = (issues: { message: string }[]) => issues[0]?.message ?? "Datos inválidos";

const DUPLICADA = "Ya hay una salida vigente ese día en ese sentido";

function revalidar() {
  revalidatePath("/admin/programacion");
}

async function busetaPrincipal(supabase: Cliente): Promise<string | null> {
  const { data } = await supabase.from("busetas").select("id").eq("activa", true).order("creado_en").limit(1).maybeSingle();
  return data?.id ?? null;
}

/** Digitar una salida programada del mes. */
export async function crearSalida(entrada: SalidaEntrada): Promise<Resultado> {
  await exigirRol("admin");
  const datos = esquemaSalida.safeParse(entrada);
  if (!datos.success) return { error: primerMensaje(datos.error.issues) };

  const supabase = await crearClienteServidor();
  const buseta = await busetaPrincipal(supabase);
  if (!buseta) return { error: "No hay una buseta activa" };

  const { error } = await supabase.from("programacion_salidas").insert({
    buseta_id: buseta,
    fecha: datos.data.fecha,
    hora: datos.data.hora ?? null,
    sentido: datos.data.sentido,
    notas: datos.data.notas || null,
  });
  if (error?.code === "23505") return { error: DUPLICADA };
  if (error) return { error: "No se pudo guardar la salida" };
  revalidar();
  return { error: null };
}

/** Corregir fecha, hora, sentido o notas de una salida que aún no se ha hecho. */
export async function editarSalida(entrada: EditarSalida): Promise<Resultado> {
  await exigirRol("admin");
  const datos = esquemaEditarSalida.safeParse(entrada);
  if (!datos.success) return { error: primerMensaje(datos.error.issues) };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("programacion_salidas")
    .update({
      fecha: datos.data.fecha,
      hora: datos.data.hora ?? null,
      sentido: datos.data.sentido,
      notas: datos.data.notas || null,
    })
    .eq("id", datos.data.id)
    .eq("estado", "pendiente")
    .select("id");
  if (error?.code === "23505") return { error: DUPLICADA };
  if (error || !data.length) return { error: "Solo se puede corregir una salida pendiente" };
  revalidar();
  return { error: null };
}

/** Cancelar una salida pendiente (queda marcada con el motivo, nunca se borra). */
export async function cancelarSalida(entrada: { id: string; motivo: string }): Promise<Resultado> {
  await exigirRol("admin");
  const datos = esquemaCancelarSalida.safeParse(entrada);
  if (!datos.success) return { error: primerMensaje(datos.error.issues) };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("programacion_salidas")
    .update({ estado: "cancelada", notas: `Cancelada: ${datos.data.motivo}` })
    .eq("id", datos.data.id)
    .eq("estado", "pendiente")
    .select("id");
  if (error || !data.length) return { error: "Solo se puede cancelar una salida pendiente" };
  revalidar();
  return { error: null };
}

/**
 * Salida adicional (día no programado). La base cancela la salida programada del
 * día siguiente en el mismo sentido (registrar_salida_adicional). Si viene de un
 * trayecto sin salida, se enlaza de una vez y queda realizada.
 */
export async function registrarAdicional(entrada: AdicionalEntrada): Promise<Resultado> {
  await exigirRol("admin");
  const datos = esquemaAdicional.safeParse(entrada);
  if (!datos.success) return { error: primerMensaje(datos.error.issues) };

  const supabase = await crearClienteServidor();
  const buseta = await busetaPrincipal(supabase);
  if (!buseta) return { error: "No hay una buseta activa" };

  const { data: id, error } = await supabase.rpc("registrar_salida_adicional", {
    p_buseta: buseta,
    p_fecha: datos.data.fecha,
    p_hora: datos.data.hora ?? undefined,
    p_sentido: datos.data.sentido,
    p_notas: datos.data.notas || undefined,
  });
  if (error?.code === "23505") return { error: DUPLICADA };
  if (error || !id) return { error: "No se pudo registrar la salida adicional" };

  if (datos.data.trayecto_id) {
    const { error: e2 } = await supabase
      .from("trayectos")
      .update({ salida_programada_id: id })
      .eq("id", datos.data.trayecto_id)
      .is("salida_programada_id", null);
    if (e2) return { error: "La adicional quedó registrada, pero no se pudo enlazar el trayecto" };
  }
  revalidar();
  return { error: null };
}

/** Enlazar (o desenlazar con null) un trayecto con una salida, por ejemplo un regreso que se corrió. */
export async function enlazarTrayecto(entrada: { trayecto_id: string; salida_id: string | null }): Promise<Resultado> {
  await exigirRol("admin");
  const datos = esquemaEnlazarTrayecto.safeParse(entrada);
  if (!datos.success) return { error: "Datos inválidos" };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("trayectos")
    .update({ salida_programada_id: datos.data.salida_id })
    .eq("id", datos.data.trayecto_id)
    .select("id");
  if (error?.code === "23505") return { error: "Esa salida ya tiene un trayecto" };
  if (error || !data.length) return { error: "No se pudo enlazar el trayecto" };
  revalidar();
  revalidatePath("/admin/vueltas");
  return { error: null };
}
