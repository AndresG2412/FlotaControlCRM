import "server-only";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { ZodError } from "zod";
import type { Database } from "@/lib/supabase/tipos";
import {
  ESQUEMAS,
  ESTADO_ANULADO,
  esReintentable,
  type Lote,
  type Operacion,
  type ResultadoOperacion,
} from "./operaciones";

type Cliente = SupabaseClient<Database>;
type Fallo = Extract<ResultadoOperacion, { ok: false }>;
type Respuesta = { error: PostgrestError | null; data: { id: string }[] | null };

/**
 * Aplica un lote de la cola con la sesión del conductor (la RLS decide). En orden;
 * se detiene ante un error temporal o una vuelta_en_curso, porque lo que sigue
 * puede depender de eso. Lo que no alcanzó a procesar vuelve como no_procesado.
 */
export async function aplicarLote(supabase: Cliente, uid: string, lote: Lote): Promise<ResultadoOperacion[]> {
  const resultados: ResultadoOperacion[] = [];
  let detenido = false;

  for (const { clave, operacion } of lote.operaciones) {
    if (detenido) {
      resultados.push({ clave, ok: false, codigo: "no_procesado", mensaje: "Pendiente de una operación anterior" });
      continue;
    }
    const r = await aplicar(supabase, uid, clave, operacion);
    resultados.push(r);
    if (!r.ok && (esReintentable(r.codigo) || r.codigo === "vuelta_en_curso")) detenido = true;
  }
  return resultados;
}

async function aplicar(supabase: Cliente, uid: string, clave: string, op: Operacion): Promise<ResultadoOperacion> {
  try {
    let respuesta: Respuesta;
    if (op.tipo === "guardar") {
      const validado = validar(op);
      if ("error" in validado) return { clave, ...validado.error };
      respuesta = await guardar(supabase, uid, validado.op);
    } else if (op.tipo === "anular") {
      respuesta = await supabase
        .from(op.tabla)
        .update({ estado: ESTADO_ANULADO[op.tabla], motivo_anulacion: op.motivo_anulacion })
        .eq("id", op.id)
        .select("id");
    } else {
      respuesta = await supabase.from("vueltas").update({ estado: op.estado }).eq("id", op.id).select("id");
    }

    if (respuesta.error) return { clave, ...(await traducirError(supabase, op, respuesta.error)) };
    if (!respuesta.data?.length) {
      return { clave, ok: false, codigo: "sin_permiso", mensaje: "El registro no existe o ya no se puede modificar" };
    }
    return { clave, ok: true };
  } catch {
    return { clave, ok: false, codigo: "error_servidor", mensaje: "Error inesperado; se reintentará" };
  }
}

type GuardarValidado = { [T in keyof typeof ESQUEMAS]: { tabla: T; datos: ReturnType<(typeof ESQUEMAS)[T]["parse"]> } }[keyof typeof ESQUEMAS];

function validar(op: Extract<Operacion, { tipo: "guardar" }>): { op: GuardarValidado } | { error: Omit<Fallo, "clave"> } {
  const r = ESQUEMAS[op.tabla].safeParse(op.datos);
  if (!r.success) return { error: { ok: false, codigo: "invalido", mensaje: primerMensaje(r.error) } };
  return { op: { tabla: op.tabla, datos: r.data } as GuardarValidado };
}

function primerMensaje(error: ZodError): string {
  const i = error.issues[0];
  return i ? `${i.path.join(".") || "datos"}: ${i.message}` : "Datos inválidos";
}

/**
 * Upsert por id: reenviar no duplica. registrado_por y sincronizado_en los fija
 * el trigger auditar_registro con auth.uid(); se envía uid solo por el tipo.
 */
async function guardar(supabase: Cliente, uid: string, op: GuardarValidado): Promise<Respuesta> {
  const base = { registrado_por: uid };
  switch (op.tabla) {
    case "vueltas":
      return supabase.from("vueltas").upsert({ ...op.datos, ...base }).select("id");
    case "trayectos":
      return supabase.from("trayectos").upsert({ ...op.datos, ...base }).select("id");
    case "planillas": {
      // sentido solo sirve para validar la terminal; no es columna de planillas.
      const { sentido, ...fila } = op.datos;
      return supabase.from("planillas").upsert({ ...fila, ...base }).select("id");
    }
    case "polilla_pasajeros":
      return supabase.from("polilla_pasajeros").upsert({ ...op.datos, ...base }).select("id");
    case "encomiendas":
      return supabase.from("encomiendas").upsert({ ...op.datos, ...base }).select("id");
    case "gastos_variables":
      return supabase.from("gastos_variables").upsert({ ...op.datos, ...base }).select("id");
    case "repuestos":
      return supabase.from("repuestos").upsert({ ...op.datos, ...base }).select("id");
  }
}

/** Traduce errores de Postgres a códigos que la cola entiende. Sin detalles internos. */
async function traducirError(supabase: Cliente, op: Operacion, e: PostgrestError): Promise<Omit<Fallo, "clave">> {
  if (e.code === "23505" && e.message.includes("vueltas_una_en_curso") && op.tipo === "guardar") {
    const buseta = op.datos.buseta_id;
    const { data } = await supabase
      .from("vueltas")
      .select("id")
      .eq("buseta_id", typeof buseta === "string" ? buseta : "")
      .eq("estado", "en_curso")
      .maybeSingle();
    return {
      ok: false,
      codigo: "vuelta_en_curso",
      mensaje: "Ya hay una vuelta en curso; los registros pasan a esa vuelta",
      vueltaEnCursoId: data?.id,
    };
  }
  if (e.code === "23505") return { ok: false, codigo: "conflicto", mensaje: "Ya existe un registro igual" };
  if (e.code === "42501" || e.message.includes("row-level security")) {
    return { ok: false, codigo: "sin_permiso", mensaje: "No tienes permiso o la vuelta ya está cerrada" };
  }
  if (["23514", "23502", "23503", "22P02", "22023"].includes(e.code)) {
    return { ok: false, codigo: "invalido", mensaje: e.message.slice(0, 200) };
  }
  return { ok: false, codigo: "error_servidor", mensaje: "Error del servidor; se reintentará" };
}
