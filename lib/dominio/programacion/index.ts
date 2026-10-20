// Programación de salidas: regresos pendientes, salidas adicionales y ventanas de
// regreso. Funciones puras; la base aplica la cancelación de forma atómica en
// registrar_salida_adicional() y aquí se calcula lo demás.
//
// Reglas (CLAUDE.md, Módulo 3):
// - Cada ida deja un regreso pendiente. Fecha sugerida: el día siguiente a llegar
//   a Cali. Si ese día no hay pasajeros el regreso se corre, pero nunca desaparece.
// - Una salida adicional cancela la salida programada del día siguiente en el mismo
//   sentido (la buseta está en la otra punta de la ruta).
// - Si una ida adicional canceló una ida programada, hereda su regreso: puede
//   regresar desde el día siguiente a la adicional hasta el regreso que le tocaba
//   a la ida cancelada.

import { diasDelMes, sumarDias, type FechaISO } from "../fechas";
import type { Sentido } from "../ruta";

export type TipoSalida = "programada" | "adicional";
export type EstadoSalida = "pendiente" | "realizada" | "cancelada_por_adicional" | "cancelada";

export type Salida = {
  id: string;
  fecha: FechaISO;
  /** "HH:MM" o null si no se conoce la hora. */
  hora: string | null;
  sentido: Sentido;
  tipo: TipoSalida;
  estado: EstadoSalida;
  canceladaPorId: string | null;
};

export type OpcionesProgramacion = {
  /** Días entre la salida de Florencia y la llegada a Cali (0 = llega el mismo día). */
  diasHastaCali?: number;
};

export function esVigente(s: Salida): boolean {
  return s.estado === "pendiente" || s.estado === "realizada";
}

function ordenar<S extends Salida>(salidas: readonly S[]): S[] {
  return [...salidas].sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || (a.hora ?? "").localeCompare(b.hora ?? ""),
  );
}

/**
 * Qué salida cancela una adicional: la programada, pendiente, del día siguiente y
 * del mismo sentido. null si ese día no había nada programado.
 */
export function salidaQueCancela(
  salidas: readonly Salida[],
  adicional: Pick<Salida, "fecha" | "sentido">,
): Salida | null {
  const manana = sumarDias(adicional.fecha, 1);
  return (
    salidas.find(
      (s) =>
        s.fecha === manana &&
        s.sentido === adicional.sentido &&
        s.tipo === "programada" &&
        s.estado === "pendiente",
    ) ?? null
  );
}

export type EstadoRegreso = "hecho" | "programado" | "pendiente" | "atrasado";

export type RegresoEsperado = {
  idaId: string;
  /** Primer día en que puede regresar. */
  desde: FechaISO;
  /** Último día de la ventana normal; después sigue pendiente, pero atrasado. */
  hasta: FechaISO;
  /** Salida de regreso que lo cubre (realizada o programada), si existe. */
  regresoId: string | null;
  estado: EstadoRegreso;
};

/**
 * Para cada ida vigente, cuál es su regreso: el primer regreso vigente desde el
 * día de la ida y antes de la siguiente ida. Si no hay, queda pendiente (o
 * atrasado si ya pasó la ventana).
 */
export function regresosEsperados(
  salidas: readonly Salida[],
  hoy: FechaISO,
  { diasHastaCali = 0 }: OpcionesProgramacion = {},
): RegresoEsperado[] {
  const vigentes = ordenar(salidas.filter(esVigente));
  const idas = vigentes.filter((s) => s.sentido === "ida");
  const regresos = vigentes.filter((s) => s.sentido === "regreso");
  const usados = new Set<string>();

  return idas.map((ida, i) => {
    const siguienteIda = idas[i + 1];
    const desde = sumarDias(ida.fecha, diasHastaCali + 1);

    const heredada =
      ida.tipo === "adicional"
        ? salidas.find((s) => s.canceladaPorId === ida.id && s.sentido === "ida")
        : undefined;
    const hasta = heredada ? sumarDias(heredada.fecha, diasHastaCali + 1) : desde;

    const regreso = regresos.find(
      (r) =>
        !usados.has(r.id) &&
        r.fecha >= ida.fecha &&
        (!siguienteIda || r.fecha <= siguienteIda.fecha),
    );
    if (regreso) usados.add(regreso.id);

    let estado: EstadoRegreso;
    if (regreso?.estado === "realizada") estado = "hecho";
    else if (regreso) estado = "programado";
    else estado = hoy > hasta ? "atrasado" : "pendiente";

    return { idaId: ida.id, desde, hasta, regresoId: regreso?.id ?? null, estado };
  });
}

export type DiaProgramacion<S extends Salida = Salida> = {
  fecha: FechaISO;
  salidas: S[];
  /** La buseta está en Cali esperando regreso: no puede salir de Florencia. */
  enCali: boolean;
  /** Sin salidas vigentes y en Florencia: disponible. */
  disponible: boolean;
};

/** Vista de calendario de un mes "YYYY-MM": salidas, dónde está la buseta y disponibilidad. */
export function calendarioDelMes<S extends Salida>(
  salidas: readonly S[],
  mes: string,
  hoy: FechaISO,
  opciones: OpcionesProgramacion = {},
): DiaProgramacion<S>[] {
  const vigentes = salidas.filter(esVigente);
  const regresos = regresosEsperados(salidas, hoy, opciones);
  const porId = new Map(salidas.map((s) => [s.id, s]));
  const diasHastaCali = opciones.diasHastaCali ?? 0;

  // Rango de días en que la buseta está fuera de Florencia por cada ida.
  const fuera = regresos.map((r) => {
    const ida = porId.get(r.idaId);
    const salidaDeFlorencia = ida ? ida.fecha : r.desde;
    const regreso = r.regresoId ? porId.get(r.regresoId) : undefined;
    const vuelveA = regreso ? regreso.fecha : r.estado === "atrasado" ? hoy : r.hasta;
    return { desde: sumarDias(salidaDeFlorencia, diasHastaCali + 1), hasta: vuelveA };
  });

  return diasDelMes(mes).map((fecha) => {
    const delDia = ordenar(salidas.filter((s) => s.fecha === fecha));
    const enCali = fuera.some((f) => fecha >= f.desde && fecha < f.hasta);
    const conSalida = vigentes.some((s) => s.fecha === fecha);
    return { fecha, salidas: delDia, enCali, disponible: !conSalida && !enCali };
  });
}

/** Fila de programacion_salidas tal como llega de la base (texto sin validar). */
export type FilaSalida = {
  id: string;
  fecha: string;
  hora: string | null;
  sentido: string;
  tipo: string;
  estado: string;
  cancelada_por_id: string | null;
};

const TIPOS_SALIDA: readonly TipoSalida[] = ["programada", "adicional"];
const ESTADOS_SALIDA: readonly EstadoSalida[] = ["pendiente", "realizada", "cancelada_por_adicional", "cancelada"];

/** Convierte una fila de la base en Salida (null si trae valores desconocidos). Hora "HH:MM". */
export function salidaDesdeFila(f: FilaSalida): Salida | null {
  const tipo = TIPOS_SALIDA.find((t) => t === f.tipo);
  const estado = ESTADOS_SALIDA.find((e) => e === f.estado);
  if ((f.sentido !== "ida" && f.sentido !== "regreso") || !tipo || !estado) return null;
  return {
    id: f.id,
    fecha: f.fecha,
    hora: f.hora ? f.hora.slice(0, 5) : null,
    sentido: f.sentido,
    tipo,
    estado,
    canceladaPorId: f.cancelada_por_id,
  };
}

export const ETIQUETA_ESTADO_SALIDA: Record<EstadoSalida, string> = {
  pendiente: "Pendiente",
  realizada: "Realizada",
  cancelada_por_adicional: "Cancelada por adicional",
  cancelada: "Cancelada",
};

export const ETIQUETA_ESTADO_REGRESO: Record<EstadoRegreso, string> = {
  hecho: "Regresó",
  programado: "Regreso programado",
  pendiente: "Regreso pendiente",
  atrasado: "Regreso atrasado",
};
