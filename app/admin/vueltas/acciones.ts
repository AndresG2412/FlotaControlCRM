"use server";

import { revalidatePath } from "next/cache";
import { exigirRol } from "@/lib/auth/sesion";
import { hoyEnBogota } from "@/lib/dominio/fechas";
import { accionesAdmin, esEstadoVuelta } from "@/lib/dominio/vuelta";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import {
  esquemaAjusteGastoFijo,
  esquemaCierreVuelta,
  esquemaCorreccionPlanilla,
  esquemaDatosVuelta,
  esquemaEncomiendaAdmin,
  esquemaGastoVariableAdmin,
  esquemaIdVuelta,
  esquemaIniciarTrayectoAdmin,
  esquemaPasajeroAdmin,
  esquemaPlanillaAdmin,
  esquemaReabrirCerrada,
  type AjusteGastoFijo,
  type CierreVuelta,
  type CorreccionPlanilla,
  type DatosVuelta,
  type EncomiendaAdminEntrada,
  type GastoVariableAdminEntrada,
  type IniciarTrayectoAdmin,
  type PasajeroAdminEntrada,
  type PlanillaAdminEntrada,
  type ReabrirCerrada,
} from "@/lib/validaciones/admin";
import {
  esquemaAnulacion,
  esquemaEncomienda,
  esquemaGastoVariable,
  esquemaPlanilla,
  esquemaPolilla,
} from "@/lib/validaciones/registros";

// Acciones del admin sobre vueltas y planillas. Cada una verifica el rol, valida
// con Zod y escribe con la sesión del admin (la RLS y los checks son la última
// barrera). El cierre con cuadre usa el RPC cerrar_vuelta.

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
    foto_path: c.foto_path !== undefined ? c.foto_path : actual.foto_path,
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
      foto_path: p.foto_path ?? null,
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

const AVISO_EN_CURSO = "Ya hay una vuelta en curso en esta buseta. Hay que finalizarla antes de iniciar otra.";

/**
 * El admin inicia la vuelta de hoy (Bogotá), sin elegir conductor: queda sin
 * conductores asignados. Si un conductor la usa desde el celular, se une a ella;
 * el admin también puede asignarlos desde el detalle. Solo una en curso por buseta.
 */
export async function iniciarVueltaAdmin(): Promise<Resultado & { id?: string }> {
  const perfil = await exigirRol("admin");
  const supabase = await crearClienteServidor();

  const { data: buseta } = await supabase
    .from("busetas").select("id").eq("activa", true).order("creado_en").limit(1).maybeSingle();
  if (!buseta) return { error: "No hay una buseta activa" };

  const { data: enCurso } = await supabase
    .from("vueltas").select("id").eq("buseta_id", buseta.id).eq("estado", "en_curso").maybeSingle();
  if (enCurso) return { error: AVISO_EN_CURSO };

  const id = crypto.randomUUID();
  const { error } = await supabase.from("vueltas").insert({
    id,
    buseta_id: buseta.id,
    tipo: "completa",
    fecha_inicio: hoyEnBogota(),
    conductor_florencia_id: null,
    conductor_pitalito_id: null,
    registrado_por: perfil.id, // la base lo vuelve a poner con auth.uid()
  });
  if (error?.code === "23505" && error.message.includes("vueltas_una_en_curso")) return { error: AVISO_EN_CURSO };
  if (error) return { error: "No se pudo iniciar la vuelta" };

  revalidar(id);
  return { error: null, id };
}

/**
 * El admin finaliza la vuelta en curso (como lo haría el conductor). Después se
 * puede cerrar con el cuadre o reabrir si fue un error.
 */
export async function finalizarVuelta(entrada: { id: string }): Promise<Resultado> {
  await exigirRol("admin");
  const datos = esquemaIdVuelta.safeParse(entrada);
  if (!datos.success) return { error: "Datos inválidos" };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("vueltas")
    .update({ estado: "finalizada" })
    .eq("id", datos.data.id)
    .eq("estado", "en_curso")
    .select("id");
  if (error) return { error: "No se pudo finalizar la vuelta" };
  if (!data.length) return { error: "Solo se puede finalizar una vuelta en curso" };

  revalidar(datos.data.id);
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

/** "Eliminar" un gasto variable: queda anulado con su motivo. Solo si la vuelta no está cerrada. */
export async function anularGasto(entrada: { id: string; motivo_anulacion: string }): Promise<Resultado> {
  await exigirRol("admin");
  const datos = esquemaAnulacion.strict().safeParse(entrada);
  if (!datos.success) return { error: primerMensaje(datos.error.issues) };

  const supabase = await crearClienteServidor();
  const { data: actual } = await supabase
    .from("gastos_variables")
    .select("id, estado, vuelta_id")
    .eq("id", datos.data.id)
    .maybeSingle();
  if (!actual || actual.estado !== "activo") return { error: "El gasto no existe o ya fue eliminado" };
  const bloqueo = await vueltaEditable(supabase, actual.vuelta_id);
  if (bloqueo) return { error: bloqueo };

  const { data, error } = await supabase
    .from("gastos_variables")
    .update({ estado: "anulado", motivo_anulacion: datos.data.motivo_anulacion })
    .eq("id", datos.data.id)
    .eq("estado", "activo")
    .select("id");
  if (error || !data.length) return { error: "No se pudo eliminar el gasto" };

  revalidar(actual.vuelta_id);
  return { error: null };
}

/**
 * Ajusta el valor de un gasto fijo en esta vuelta (ej. ese día no hubo lavada).
 * Si luego cambian el tipo o la fecha de la vuelta, la base recarga los fijos desde
 * la configuración y este ajuste se pierde.
 */
export async function ajustarGastoFijo(entrada: AjusteGastoFijo): Promise<Resultado> {
  await exigirRol("admin");
  const datos = esquemaAjusteGastoFijo.safeParse(entrada);
  if (!datos.success) return { error: primerMensaje(datos.error.issues) };

  const supabase = await crearClienteServidor();
  const { data: actual } = await supabase
    .from("vuelta_gastos_fijos")
    .select("id, vuelta_id")
    .eq("id", datos.data.id)
    .maybeSingle();
  if (!actual) return { error: "El gasto fijo no existe" };
  const bloqueo = await vueltaEditable(supabase, actual.vuelta_id);
  if (bloqueo) return { error: bloqueo };

  const { data, error } = await supabase
    .from("vuelta_gastos_fijos")
    .update({ valor: datos.data.valor })
    .eq("id", datos.data.id)
    .select("id");
  if (error || !data.length) return { error: "No se pudo guardar el ajuste" };

  revalidar(actual.vuelta_id);
  return { error: null };
}

/** Cierra una vuelta finalizada con el efectivo que entregó el conductor (RPC cerrar_vuelta). */
export async function cerrarVuelta(entrada: CierreVuelta): Promise<Resultado> {
  await exigirRol("admin");
  const datos = esquemaCierreVuelta.safeParse(entrada);
  if (!datos.success) return { error: primerMensaje(datos.error.issues) };

  const supabase = await crearClienteServidor();
  const { data: actual } = await supabase.from("vueltas").select("estado").eq("id", datos.data.id).maybeSingle();
  if (!actual || !esEstadoVuelta(actual.estado)) return { error: "La vuelta no existe" };
  if (!accionesAdmin(actual.estado).cerrar) {
    return { error: actual.estado === "cerrada" ? "La vuelta ya está cerrada" : "Solo se puede cerrar una vuelta finalizada" };
  }

  const { error } = await supabase.rpc("cerrar_vuelta", {
    p_vuelta: datos.data.id,
    p_efectivo_entregado: datos.data.efectivo_entregado,
    p_notas: datos.data.notas || undefined,
  });
  if (error) return { error: "No se pudo cerrar la vuelta" };

  revalidar(datos.data.id);
  return { error: null };
}

/** Reabre una vuelta cerrada (queda finalizada); el cuadre anterior se conserva en el historial. */
export async function reabrirVueltaCerrada(entrada: ReabrirCerrada): Promise<Resultado> {
  await exigirRol("admin");
  const datos = esquemaReabrirCerrada.safeParse(entrada);
  if (!datos.success) return { error: primerMensaje(datos.error.issues) };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("reabrir_vuelta_cerrada", {
    p_vuelta: datos.data.id,
    p_motivo: datos.data.motivo,
  });
  if (error?.code === "23514") return { error: "Solo se puede reabrir una vuelta cerrada" };
  if (error) return { error: "No se pudo reabrir la vuelta cerrada" };

  revalidar(datos.data.id);
  return { error: null };
}

/** Inicia un trayecto (ida o regreso) dentro de la vuelta. */
export async function iniciarTrayectoAdmin(entrada: IniciarTrayectoAdmin): Promise<Resultado & { id?: string }> {
  const perfil = await exigirRol("admin");
  const datos = esquemaIniciarTrayectoAdmin.safeParse(entrada);
  if (!datos.success) return { error: primerMensaje(datos.error.issues) };

  const supabase = await crearClienteServidor();
  const bloqueo = await vueltaEditable(supabase, datos.data.vuelta_id);
  if (bloqueo) return { error: bloqueo };

  const { data: existente } = await supabase
    .from("trayectos")
    .select("id")
    .eq("vuelta_id", datos.data.vuelta_id)
    .eq("sentido", datos.data.sentido)
    .maybeSingle();
  if (existente) return { error: `El trayecto de ${datos.data.sentido} ya existe` };

  if (datos.data.sentido === "regreso") {
    const { data: ida } = await supabase
      .from("trayectos")
      .select("id")
      .eq("vuelta_id", datos.data.vuelta_id)
      .eq("sentido", "ida")
      .maybeSingle();
    if (!ida) return { error: "Primero hay que iniciar la ida" };
  }

  const id = crypto.randomUUID();
  const hora = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  const { error } = await supabase.from("trayectos").insert({
    id,
    vuelta_id: datos.data.vuelta_id,
    sentido: datos.data.sentido,
    fecha: hoyEnBogota(),
    hora_salida: hora,
    ocurrido_en: new Date().toISOString(),
    registrado_por: perfil.id,
  });
  if (error) return { error: "No se pudo iniciar el trayecto" };

  revalidar(datos.data.vuelta_id);
  return { error: null, id };
}

/** Registra una planilla nueva en una terminal de un trayecto. */
export async function registrarPlanillaAdmin(entrada: PlanillaAdminEntrada): Promise<Resultado & { id?: string }> {
  const perfil = await exigirRol("admin");
  const datos = esquemaPlanillaAdmin.safeParse(entrada);
  if (!datos.success) return { error: primerMensaje(datos.error.issues) };

  const supabase = await crearClienteServidor();
  const { data: trayecto } = await supabase
    .from("trayectos")
    .select("id, vuelta_id, sentido")
    .eq("id", datos.data.trayecto_id)
    .maybeSingle();
  if (!trayecto) return { error: "El trayecto no existe" };

  const bloqueo = await vueltaEditable(supabase, trayecto.vuelta_id);
  if (bloqueo) return { error: bloqueo };

  const id = crypto.randomUUID();
  const ocurrido_en = new Date().toISOString();

  const completa = esquemaPlanilla.safeParse({
    id,
    ocurrido_en,
    trayecto_id: trayecto.id,
    sentido: trayecto.sentido,
    terminal: datos.data.terminal,
    emitida: datos.data.emitida,
    neto: datos.data.emitida ? datos.data.neto : null,
    numero: datos.data.emitida ? datos.data.numero || null : null,
    pasajeros: datos.data.emitida ? datos.data.pasajeros : null,
    motivo_sin_planilla: datos.data.emitida ? null : datos.data.motivo_sin_planilla || null,
    foto_path: datos.data.foto_path ?? null,
  });
  if (!completa.success) return { error: primerMensaje(completa.error.issues) };

  const p = completa.data;
  const { error } = await supabase.from("planillas").insert({
    id: p.id,
    trayecto_id: p.trayecto_id,
    terminal: p.terminal,
    emitida: p.emitida,
    neto: p.neto ?? null,
    numero: p.numero ?? null,
    pasajeros: p.pasajeros ?? null,
    motivo_sin_planilla: p.motivo_sin_planilla ?? null,
    foto_path: p.foto_path ?? null,
    ocurrido_en: p.ocurrido_en,
    registrado_por: perfil.id,
  });
  if (error) return { error: "No se pudo guardar la planilla" };

  revalidar(trayecto.vuelta_id);
  return { error: null, id: p.id };
}

/** Registra un pasajero de vía en un trayecto. */
export async function guardarPasajeroAdmin(entrada: PasajeroAdminEntrada): Promise<Resultado & { id?: string }> {
  const perfil = await exigirRol("admin");
  const datos = esquemaPasajeroAdmin.safeParse(entrada);
  if (!datos.success) return { error: primerMensaje(datos.error.issues) };

  const supabase = await crearClienteServidor();
  const { data: trayecto } = await supabase
    .from("trayectos")
    .select("id, vuelta_id, sentido")
    .eq("id", datos.data.trayecto_id)
    .maybeSingle();
  if (!trayecto) return { error: "El trayecto no existe" };

  const bloqueo = await vueltaEditable(supabase, trayecto.vuelta_id);
  if (bloqueo) return { error: bloqueo };

  const id = crypto.randomUUID();
  const ocurrido_en = new Date().toISOString();

  const completa = esquemaPolilla.safeParse({
    id,
    ocurrido_en,
    trayecto_id: trayecto.id,
    sentido: trayecto.sentido,
    tramo_id: datos.data.tramo_id,
    destino: datos.data.destino,
    monto_cobrado: datos.data.monto_cobrado,
    facturado: datos.data.facturado,
    terminal_facturacion: datos.data.terminal_facturacion ?? null,
    monto_facturado: datos.data.monto_facturado,
    destino_sobrante: datos.data.destino_sobrante,
  });
  if (!completa.success) return { error: primerMensaje(completa.error.issues) };

  const p = completa.data;
  const { error } = await supabase.from("polilla_pasajeros").insert({
    id: p.id,
    trayecto_id: p.trayecto_id,
    tramo_id: p.tramo_id,
    destino: p.destino,
    monto_cobrado: p.monto_cobrado,
    facturado: p.facturado,
    terminal_facturacion: p.terminal_facturacion ?? null,
    monto_facturado: p.monto_facturado,
    destino_sobrante: p.destino_sobrante,
    ocurrido_en: p.ocurrido_en,
    registrado_por: perfil.id,
  });
  if (error) return { error: "No se pudo guardar el pasajero" };

  revalidar(trayecto.vuelta_id);
  return { error: null, id: p.id };
}

/** Registra una encomienda en un trayecto. */
export async function guardarEncomiendaAdmin(entrada: EncomiendaAdminEntrada): Promise<Resultado & { id?: string }> {
  const perfil = await exigirRol("admin");
  const datos = esquemaEncomiendaAdmin.safeParse(entrada);
  if (!datos.success) return { error: primerMensaje(datos.error.issues) };

  const supabase = await crearClienteServidor();
  const { data: trayecto } = await supabase
    .from("trayectos")
    .select("id, vuelta_id, sentido")
    .eq("id", datos.data.trayecto_id)
    .maybeSingle();
  if (!trayecto) return { error: "El trayecto no existe" };

  const bloqueo = await vueltaEditable(supabase, trayecto.vuelta_id);
  if (bloqueo) return { error: bloqueo };

  const id = crypto.randomUUID();
  const ocurrido_en = new Date().toISOString();

  const completa = esquemaEncomienda.safeParse({
    id,
    ocurrido_en,
    trayecto_id: trayecto.id,
    sentido: trayecto.sentido,
    recibida_en_terminal: datos.data.recibida_en_terminal ?? null,
    recibida_en_tramo: datos.data.recibida_en_tramo ?? null,
    destino: datos.data.destino,
    descripcion: datos.data.descripcion ?? null,
    monto: datos.data.monto,
  });
  if (!completa.success) return { error: primerMensaje(completa.error.issues) };

  const e = completa.data;
  const { error } = await supabase.from("encomiendas").insert({
    id: e.id,
    trayecto_id: e.trayecto_id,
    recibida_en_terminal: e.recibida_en_terminal ?? null,
    recibida_en_tramo: e.recibida_en_tramo ?? null,
    destino: e.destino,
    descripcion: e.descripcion ?? null,
    monto: e.monto,
    ocurrido_en: e.ocurrido_en,
    registrado_por: perfil.id,
  });
  if (error) return { error: "No se pudo guardar la encomienda" };

  revalidar(trayecto.vuelta_id);
  return { error: null, id: e.id };
}

/** Registra un gasto variable en la vuelta. */
export async function guardarGastoAdmin(entrada: GastoVariableAdminEntrada): Promise<Resultado & { id?: string }> {
  const perfil = await exigirRol("admin");
  const datos = esquemaGastoVariableAdmin.safeParse(entrada);
  if (!datos.success) return { error: primerMensaje(datos.error.issues) };

  const supabase = await crearClienteServidor();
  const bloqueo = await vueltaEditable(supabase, datos.data.vuelta_id);
  if (bloqueo) return { error: bloqueo };

  const id = crypto.randomUUID();
  const ocurrido_en = new Date().toISOString();

  const completa = esquemaGastoVariable.safeParse({
    id,
    ocurrido_en,
    vuelta_id: datos.data.vuelta_id,
    trayecto_id: datos.data.trayecto_id ?? null,
    tipo: datos.data.tipo,
    descripcion: datos.data.descripcion ?? null,
    monto: datos.data.monto,
    terminal: datos.data.terminal ?? null,
    galones: datos.data.galones ?? null,
    lugar: datos.data.lugar ?? null,
    foto_path: datos.data.foto_path ?? null,
  });
  if (!completa.success) return { error: primerMensaje(completa.error.issues) };

  const g = completa.data;
  const { error } = await supabase.from("gastos_variables").insert({
    id: g.id,
    vuelta_id: g.vuelta_id,
    trayecto_id: g.trayecto_id ?? null,
    tipo: g.tipo,
    descripcion: g.descripcion ?? null,
    monto: g.monto,
    terminal: g.terminal ?? null,
    galones: g.galones ?? null,
    lugar: g.lugar ?? null,
    foto_path: g.foto_path ?? null,
    ocurrido_en: g.ocurrido_en,
    registrado_por: perfil.id,
  });
  if (error) return { error: "No se pudo guardar el gasto" };

  revalidar(g.vuelta_id);
  return { error: null, id: g.id };
}
