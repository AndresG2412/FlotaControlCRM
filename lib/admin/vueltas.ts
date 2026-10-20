import "server-only";
import { z } from "zod";
import { exigirRol } from "@/lib/auth/sesion";
import { rangoDelMes, horaSospechosa } from "@/lib/dominio/fechas";
import { estadoTerminales, resumenPlanillas, type ConteoPlanillas, type TerminalConPlanilla } from "@/lib/dominio/planillas";
import { esSentido, esTerminal, type CodigoTerminal, type Sentido } from "@/lib/dominio/ruta";
import type { DestinoSobrante } from "@/lib/dominio/polilla";
import {
  esEstadoVuelta,
  esTipoVuelta,
  trayectosFaltantes,
  type EstadoVuelta,
  type TipoVuelta,
} from "@/lib/dominio/vuelta";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { FiltrosVueltas } from "@/lib/validaciones/admin";

// Lectura de vueltas para el panel del admin. Usa la sesión del admin (la RLS
// aplica) y cada función exportada verifica el rol por su cuenta (AUTZ-6).
// Los totales de ingreso salen solo de la vista reporte_vueltas (nunca se
// recalculan aquí), igual que gastos, liquidación y cuadre.

/** Las URLs firmadas de fotos vencen pronto; recargar la página genera otras. */
const SEGUNDOS_URL_FOTO = 10 * 60;
const MAX_VUELTAS_LISTA = 200;

export type Persona = { id: string; nombre: string };

export type VueltaEnLista = {
  id: string;
  fecha_inicio: string;
  tipo: TipoVuelta;
  estado: EstadoVuelta;
  placa: string | null;
  conductorFlorencia: string | null;
  conductorPitalito: string | null;
  trayectos: number;
  faltan: Sentido[];
  planillas: ConteoPlanillas;
  /** Ganancia (+) o pérdida (−) según reporte_vueltas; null si aún está en curso o no se pudo leer. */
  liquidacion: number | null;
};

export type PlanillaDetalle = {
  id: string;
  terminal: CodigoTerminal;
  emitida: boolean;
  neto: number | null;
  numero: string | null;
  pasajeros: number | null;
  motivo_sin_planilla: string | null;
  estado: "activa" | "anulada";
  motivo_anulacion: string | null;
  fotoUrl: string | null;
  ocurrido_en: string;
  sincronizado_en: string;
  actualizado_en: string | null;
  registradoPor: string;
  actualizadoPor: string | null;
  horaSospechosa: boolean;
};

type Autoria = {
  ocurrido_en: string;
  sincronizado_en: string;
  actualizado_en: string | null;
  registradoPor: string;
  actualizadoPor: string | null;
  horaSospechosa: boolean;
};

export type PasajeroDetalle = Autoria & {
  id: string;
  tramo_id: string;
  destino: CodigoTerminal;
  monto_cobrado: number;
  facturado: boolean;
  terminal_facturacion: CodigoTerminal | null;
  monto_facturado: number;
  sobrante: number;
  destino_sobrante: DestinoSobrante;
  estado: "activo" | "anulado";
  motivo_anulacion: string | null;
};

export type EncomiendaDetalle = Autoria & {
  id: string;
  recibida_en_terminal: CodigoTerminal | null;
  recibida_en_tramo: string | null;
  destino: CodigoTerminal;
  descripcion: string | null;
  monto: number;
  estado: "activa" | "anulada";
  motivo_anulacion: string | null;
};

export type GastoFijoVuelta = {
  id: string;
  concepto: string;
  valor: number;
  sePagaEnRuta: boolean;
  actualizado_en: string | null;
  actualizadoPor: string | null;
};

export type GastoVariableDetalle = Autoria & {
  id: string;
  tipo: "acpm" | "liga" | "extra" | "arreglo";
  descripcion: string | null;
  monto: number;
  terminal: CodigoTerminal | null;
  galones: number | null;
  lugar: string | null;
  fotoUrl: string | null;
  estado: "activo" | "anulado";
  motivo_anulacion: string | null;
};

/** Dinero de la vuelta leído de reporte_vueltas (nunca recalculado aquí). */
export type ResumenDinero = {
  ingresoReal: number;
  gastosFijos: number;
  gastosVariables: number;
  gastosMinimos: number;
  /** Ganancia (+) o pérdida (−). */
  liquidacion: number;
  efectivoEsperado: number;
  efectivoEntregado: number | null;
  diferenciaCuadre: number | null;
  cerradoEn: string | null;
};

export type CierreReemplazado = {
  efectivoEntregado: number;
  notas: string | null;
  cerradoEn: string | null;
  reabiertoEn: string;
  reabiertoPor: string;
  motivo: string;
};

/** Ingresos de la vuelta según reporte_vueltas (solo admin). */
export type IngresosVuelta = {
  planillas: number;
  polilla: number;
  encomiendas: number;
  ingresoReal: number;
  quedoConductor: number;
};

export type TrayectoDetalle = {
  id: string;
  sentido: Sentido;
  fecha: string;
  hora_salida: string | null;
  terminal_fin: CodigoTerminal | null;
  terminales: TerminalConPlanilla<PlanillaDetalle>[];
  anuladas: PlanillaDetalle[];
  pasajeros: PasajeroDetalle[];
  encomiendas: EncomiendaDetalle[];
  ocurrido_en: string;
  registradoPor: string;
};

export type VueltaDetalle = {
  id: string;
  fecha_inicio: string;
  tipo: TipoVuelta;
  estado: EstadoVuelta;
  placa: string | null;
  notas: string | null;
  conductor_florencia_id: string | null;
  conductor_pitalito_id: string | null;
  conductorFlorencia: string | null;
  conductorPitalito: string | null;
  ocurrido_en: string;
  registradoPor: string;
  actualizado_en: string | null;
  actualizadoPor: string | null;
  ida: TrayectoDetalle | null;
  regreso: TrayectoDetalle | null;
  faltan: Sentido[];
  ingresos: IngresosVuelta | null;
  dinero: ResumenDinero | null;
  gastosFijos: GastoFijoVuelta[];
  gastosVariables: GastoVariableDetalle[];
  cierresReemplazados: CierreReemplazado[];
};

type Cliente = Awaited<ReturnType<typeof crearClienteServidor>>;

async function nombres(supabase: Cliente): Promise<Map<string, string>> {
  const { data, error } = await supabase.from("perfiles").select("id, nombre");
  if (error) throw new Error("No se pudieron leer los usuarios");
  return new Map(data.map((p) => [p.id, p.nombre]));
}

const nombreDe = (mapa: Map<string, string>, id: string | null) =>
  id ? (mapa.get(id) ?? "Usuario desconocido") : null;

/** Lista de vueltas con conductores y avance de planillas, más recientes primero. */
export async function listarVueltas(filtros: FiltrosVueltas = {}): Promise<VueltaEnLista[]> {
  await exigirRol("admin");
  const supabase = await crearClienteServidor();

  let consulta = supabase
    .from("vueltas")
    .select(
      `id, fecha_inicio, tipo, estado, conductor_florencia_id, conductor_pitalito_id, ocurrido_en,
       busetas ( placa ),
       trayectos ( id, sentido, terminal_fin, planillas ( trayecto_id, terminal, emitida, estado ) )`,
    )
    .order("fecha_inicio", { ascending: false })
    .order("ocurrido_en", { ascending: false })
    .limit(MAX_VUELTAS_LISTA);

  if (filtros.mes) {
    // fecha_inicio ya es un día de Bogotá (date), así que el mes se filtra directo.
    const { desde, hasta } = rangoDelMes(filtros.mes);
    consulta = consulta.gte("fecha_inicio", desde).lte("fecha_inicio", hasta);
  }
  if (filtros.estado) consulta = consulta.eq("estado", filtros.estado);
  if (filtros.tipo) consulta = consulta.eq("tipo", filtros.tipo);

  const [{ data, error }, mapa, liquidaciones] = await Promise.all([
    consulta,
    nombres(supabase),
    supabase.from("reporte_vueltas").select("vuelta_id, liquidacion"),
  ]);
  if (error) throw new Error("No se pudieron leer las vueltas");
  const liquidacionDe = new Map((liquidaciones.data ?? []).map((r) => [r.vuelta_id, r.liquidacion]));

  return data.flatMap((v) => {
    if (!esEstadoVuelta(v.estado) || !esTipoVuelta(v.tipo)) return [];
    const trayectos = v.trayectos.flatMap((t) =>
      esSentido(t.sentido)
        ? [{ id: t.id, sentido: t.sentido, terminal_fin: esTerminal(t.terminal_fin) ? t.terminal_fin : null }]
        : [],
    );
    const planillas = v.trayectos.flatMap((t) =>
      t.planillas.flatMap((p) =>
        p.estado === "activa" && esTerminal(p.terminal)
          ? [{ trayecto_id: p.trayecto_id, terminal: p.terminal, emitida: p.emitida }]
          : [],
      ),
    );
    return [
      {
        id: v.id,
        fecha_inicio: v.fecha_inicio,
        tipo: v.tipo,
        estado: v.estado,
        placa: v.busetas?.placa ?? null,
        conductorFlorencia: nombreDe(mapa, v.conductor_florencia_id),
        conductorPitalito: nombreDe(mapa, v.conductor_pitalito_id),
        trayectos: trayectos.length,
        faltan: trayectosFaltantes(v.tipo, trayectos.map((t) => t.sentido)),
        planillas: resumenPlanillas(trayectos, planillas),
        // Una vuelta en curso todavía no se liquida.
        liquidacion: v.estado === "en_curso" ? null : (liquidacionDe.get(v.id) ?? null),
      },
    ];
  });
}

/** Detalle de una vuelta: trayectos, planillas por terminal, fotos y autores. null si no existe. */
export async function detalleVuelta(id: string): Promise<VueltaDetalle | null> {
  await exigirRol("admin");
  if (!z.uuid().safeParse(id).success) return null;
  const supabase = await crearClienteServidor();

  const [{ data: v, error }, mapa] = await Promise.all([
    supabase
      .from("vueltas")
      .select(
        `id, fecha_inicio, tipo, estado, notas, conductor_florencia_id, conductor_pitalito_id,
         ocurrido_en, registrado_por, actualizado_en, actualizado_por,
         busetas ( placa ),
         trayectos (
           id, sentido, fecha, hora_salida, terminal_fin, ocurrido_en, registrado_por,
           planillas (
             id, terminal, emitida, neto, numero, pasajeros, motivo_sin_planilla, foto_path,
             estado, motivo_anulacion, ocurrido_en, sincronizado_en, registrado_por,
             actualizado_en, actualizado_por
           ),
           polilla_pasajeros (
             id, tramo_id, destino, monto_cobrado, facturado, terminal_facturacion, monto_facturado,
             sobrante, destino_sobrante, estado, motivo_anulacion, ocurrido_en, sincronizado_en,
             registrado_por, actualizado_en, actualizado_por
           ),
           encomiendas (
             id, recibida_en_terminal, recibida_en_tramo, destino, descripcion, monto, estado,
             motivo_anulacion, ocurrido_en, sincronizado_en, registrado_por, actualizado_en, actualizado_por
           )
         )`,
      )
      .eq("id", id)
      .maybeSingle(),
    nombres(supabase),
  ]);
  if (error) throw new Error("No se pudo leer la vuelta");
  const [ingresos, dinero, fijos, variables, reemplazados] = await Promise.all([
    ingresosDeVuelta(supabase, id),
    resumenDeVuelta(supabase, id),
    supabase
      .from("vuelta_gastos_fijos")
      .select("id, concepto, valor, se_paga_en_ruta, actualizado_en, actualizado_por")
      .eq("vuelta_id", id)
      .order("concepto"),
    supabase
      .from("gastos_variables")
      .select(
        `id, tipo, descripcion, monto, terminal, galones, lugar, foto_path, estado, motivo_anulacion,
         ocurrido_en, sincronizado_en, actualizado_en, registrado_por, actualizado_por`,
      )
      .eq("vuelta_id", id)
      .order("ocurrido_en"),
    supabase
      .from("vuelta_cierres_reemplazados")
      .select("efectivo_entregado, notas, cerrado_en, reabierto_en, reabierto_por, motivo")
      .eq("vuelta_id", id)
      .order("reabierto_en", { ascending: false }),
  ]);
  if (fijos.error || variables.error || reemplazados.error) throw new Error("No se pudieron leer los gastos");
  if (!v || !esEstadoVuelta(v.estado) || !esTipoVuelta(v.tipo)) return null;

  const fotos = await urlsDeFotos(supabase, [
    ...v.trayectos.flatMap((t) => t.planillas.flatMap((p) => (p.foto_path ? [p.foto_path] : []))),
    ...variables.data.flatMap((g) => (g.foto_path ? [g.foto_path] : [])),
  ]);

  const trayectos = v.trayectos.flatMap((t): TrayectoDetalle[] => {
    if (!esSentido(t.sentido)) return [];
    const terminalFin = esTerminal(t.terminal_fin) ? t.terminal_fin : null;
    const planillas = t.planillas.flatMap((p): PlanillaDetalle[] => {
      if (!esTerminal(p.terminal)) return [];
      return [
        {
          id: p.id,
          terminal: p.terminal,
          emitida: p.emitida,
          neto: p.neto,
          numero: p.numero,
          pasajeros: p.pasajeros,
          motivo_sin_planilla: p.motivo_sin_planilla,
          estado: p.estado === "anulada" ? "anulada" : "activa",
          motivo_anulacion: p.motivo_anulacion,
          fotoUrl: p.foto_path ? (fotos.get(p.foto_path) ?? null) : null,
          ocurrido_en: p.ocurrido_en,
          sincronizado_en: p.sincronizado_en,
          actualizado_en: p.actualizado_en,
          registradoPor: nombreDe(mapa, p.registrado_por) ?? "Usuario desconocido",
          actualizadoPor: nombreDe(mapa, p.actualizado_por),
          horaSospechosa: horaSospechosa(new Date(p.ocurrido_en), new Date(p.sincronizado_en)),
        },
      ];
    });
    const autoria = (r: {
      ocurrido_en: string;
      sincronizado_en: string;
      actualizado_en: string | null;
      registrado_por: string;
      actualizado_por: string | null;
    }): Autoria => ({
      ocurrido_en: r.ocurrido_en,
      sincronizado_en: r.sincronizado_en,
      actualizado_en: r.actualizado_en,
      registradoPor: nombreDe(mapa, r.registrado_por) ?? "Usuario desconocido",
      actualizadoPor: nombreDe(mapa, r.actualizado_por),
      horaSospechosa: horaSospechosa(new Date(r.ocurrido_en), new Date(r.sincronizado_en)),
    });
    const porHora = (a: { ocurrido_en: string }, b: { ocurrido_en: string }) => a.ocurrido_en.localeCompare(b.ocurrido_en);
    const pasajeros = t.polilla_pasajeros
      .flatMap((p): PasajeroDetalle[] =>
        esTerminal(p.destino)
          ? [
              {
                ...autoria(p),
                id: p.id,
                tramo_id: p.tramo_id,
                destino: p.destino,
                monto_cobrado: p.monto_cobrado,
                facturado: p.facturado,
                terminal_facturacion: esTerminal(p.terminal_facturacion) ? p.terminal_facturacion : null,
                monto_facturado: p.monto_facturado,
                sobrante: p.sobrante ?? p.monto_cobrado - p.monto_facturado,
                destino_sobrante: p.destino_sobrante === "conductor" ? "conductor" : "polilla",
                estado: p.estado === "anulado" ? "anulado" : "activo",
                motivo_anulacion: p.motivo_anulacion,
              },
            ]
          : [],
      )
      .sort(porHora);
    const encomiendas = t.encomiendas
      .flatMap((e): EncomiendaDetalle[] =>
        esTerminal(e.destino)
          ? [
              {
                ...autoria(e),
                id: e.id,
                recibida_en_terminal: esTerminal(e.recibida_en_terminal) ? e.recibida_en_terminal : null,
                recibida_en_tramo: e.recibida_en_tramo,
                destino: e.destino,
                descripcion: e.descripcion,
                monto: e.monto,
                estado: e.estado === "anulada" ? "anulada" : "activa",
                motivo_anulacion: e.motivo_anulacion,
              },
            ]
          : [],
      )
      .sort(porHora);
    return [
      {
        id: t.id,
        sentido: t.sentido,
        fecha: t.fecha,
        hora_salida: t.hora_salida,
        terminal_fin: terminalFin,
        terminales: estadoTerminales(t.sentido, terminalFin, planillas.filter((p) => p.estado === "activa")),
        anuladas: planillas.filter((p) => p.estado === "anulada"),
        pasajeros,
        encomiendas,
        ocurrido_en: t.ocurrido_en,
        registradoPor: nombreDe(mapa, t.registrado_por) ?? "Usuario desconocido",
      },
    ];
  });

  return {
    id: v.id,
    fecha_inicio: v.fecha_inicio,
    tipo: v.tipo,
    estado: v.estado,
    placa: v.busetas?.placa ?? null,
    notas: v.notas,
    conductor_florencia_id: v.conductor_florencia_id,
    conductor_pitalito_id: v.conductor_pitalito_id,
    conductorFlorencia: nombreDe(mapa, v.conductor_florencia_id),
    conductorPitalito: nombreDe(mapa, v.conductor_pitalito_id),
    ocurrido_en: v.ocurrido_en,
    registradoPor: nombreDe(mapa, v.registrado_por) ?? "Usuario desconocido",
    actualizado_en: v.actualizado_en,
    actualizadoPor: nombreDe(mapa, v.actualizado_por),
    ida: trayectos.find((t) => t.sentido === "ida") ?? null,
    regreso: trayectos.find((t) => t.sentido === "regreso") ?? null,
    faltan: trayectosFaltantes(v.tipo, trayectos.map((t) => t.sentido)),
    ingresos,
    dinero,
    gastosFijos: fijos.data.map((f) => ({
      id: f.id,
      concepto: f.concepto,
      valor: f.valor,
      sePagaEnRuta: f.se_paga_en_ruta,
      actualizado_en: f.actualizado_en,
      actualizadoPor: nombreDe(mapa, f.actualizado_por),
    })),
    gastosVariables: variables.data.flatMap((g): GastoVariableDetalle[] =>
      esTipoGasto(g.tipo)
        ? [
            {
              id: g.id,
              tipo: g.tipo,
              descripcion: g.descripcion,
              monto: g.monto,
              terminal: esTerminal(g.terminal) ? g.terminal : null,
              galones: g.galones,
              lugar: g.lugar,
              fotoUrl: g.foto_path ? (fotos.get(g.foto_path) ?? null) : null,
              estado: g.estado === "anulado" ? "anulado" : "activo",
              motivo_anulacion: g.motivo_anulacion,
              ocurrido_en: g.ocurrido_en,
              sincronizado_en: g.sincronizado_en,
              actualizado_en: g.actualizado_en,
              registradoPor: nombreDe(mapa, g.registrado_por) ?? "Usuario desconocido",
              actualizadoPor: nombreDe(mapa, g.actualizado_por),
              horaSospechosa: horaSospechosa(new Date(g.ocurrido_en), new Date(g.sincronizado_en)),
            },
          ]
        : [],
    ),
    cierresReemplazados: reemplazados.data.map((r) => ({
      efectivoEntregado: r.efectivo_entregado,
      notas: r.notas,
      cerradoEn: r.cerrado_en,
      reabiertoEn: r.reabierto_en,
      reabiertoPor: nombreDe(mapa, r.reabierto_por) ?? "Usuario desconocido",
      motivo: r.motivo,
    })),
  };
}

const esTipoGasto = (t: string): t is GastoVariableDetalle["tipo"] =>
  t === "acpm" || t === "liga" || t === "extra" || t === "arreglo";

/**
 * Liquidación y cuadre desde reporte_vueltas: única fuente de estos números. La
 * vista devuelve 0 filas a quien no sea admin y todo en 0 para una varada.
 */
async function resumenDeVuelta(supabase: Cliente, id: string): Promise<ResumenDinero | null> {
  const { data, error } = await supabase
    .from("reporte_vueltas")
    .select(
      `ingreso_real, gastos_fijos, gastos_variables, gastos_minimos, liquidacion, efectivo_esperado,
       efectivo_entregado, diferencia_cuadre, cerrado_en`,
    )
    .eq("vuelta_id", id)
    .maybeSingle();
  if (error || !data) return null;
  return {
    ingresoReal: data.ingreso_real ?? 0,
    gastosFijos: data.gastos_fijos ?? 0,
    gastosVariables: data.gastos_variables ?? 0,
    gastosMinimos: data.gastos_minimos ?? 0,
    liquidacion: data.liquidacion ?? 0,
    efectivoEsperado: data.efectivo_esperado ?? 0,
    efectivoEntregado: data.efectivo_entregado,
    diferenciaCuadre: data.diferencia_cuadre,
    cerradoEn: data.cerrado_en,
  };
}

/**
 * Ingresos de una vuelta desde reporte_vueltas: es la única fuente de totales de
 * dinero (la vista devuelve 0 filas a quien no sea admin). Una varada da todo 0.
 */
async function ingresosDeVuelta(supabase: Cliente, id: string): Promise<IngresosVuelta | null> {
  const { data, error } = await supabase
    .from("reporte_vueltas")
    .select("ingreso_planillas, ingreso_polilla, ingreso_encomiendas, ingreso_real, quedo_conductor")
    .eq("vuelta_id", id)
    .maybeSingle();
  if (error || !data) return null;
  return {
    planillas: data.ingreso_planillas ?? 0,
    polilla: data.ingreso_polilla ?? 0,
    encomiendas: data.ingreso_encomiendas ?? 0,
    ingresoReal: data.ingreso_real ?? 0,
    quedoConductor: data.quedo_conductor ?? 0,
  };
}

/** Conductores activos, para asignarlos a una vuelta. */
export async function listarConductores(): Promise<Persona[]> {
  await exigirRol("admin");
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("perfiles")
    .select("id, nombre")
    .eq("rol", "conductor")
    .eq("activo", true)
    .order("nombre");
  if (error) throw new Error("No se pudieron leer los conductores");
  return data;
}

/**
 * URLs firmadas de corta duración (bucket privado evidencias). Se generan con la
 * sesión del admin: la política del bucket le deja leer todas las fotos.
 */
async function urlsDeFotos(supabase: Cliente, rutas: string[]): Promise<Map<string, string>> {
  if (rutas.length === 0) return new Map();
  const { data, error } = await supabase.storage.from("evidencias").createSignedUrls(rutas, SEGUNDOS_URL_FOTO);
  if (error || !data) return new Map();
  return new Map(data.flatMap((f) => (f.path && f.signedUrl && !f.error ? [[f.path, f.signedUrl] as const] : [])));
}
