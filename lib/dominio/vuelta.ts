// Ciclo de vida de una vuelta. Reglas confirmadas con el dueño:
// - Cualquier conductor puede crear la vuelta (los dos comparten sus datos y se
//   guarda quién registró cada cosa).
// - No se puede empezar una vuelta sin haber terminado la anterior: mientras haya
//   una en curso, se sigue registrando en ella terminal por terminal. La base lo
//   garantiza con el índice único vueltas_una_en_curso.
// - en_curso → finalizada (la finaliza un conductor) → cerrada (la cierra el admin).
// - Una varada queda toda en $0: ni gastos ni ganancias, aunque se haya registrado dinero.

import type { Rol } from "./roles";
import { terminalesConPlanilla, type CodigoTerminal, type Sentido } from "./ruta";

export type EstadoVuelta = "en_curso" | "finalizada" | "cerrada";
export type TipoVuelta = "completa" | "varada";
export type PuestoConductor = "florencia" | "pitalito";

export type VueltaResumen = {
  id: string;
  estado: EstadoVuelta;
};

/** Si ya hay una vuelta en curso, esa es la que se sigue llenando. */
export function vueltaEnCurso<V extends VueltaResumen>(vueltas: readonly V[]): V | null {
  return vueltas.find((v) => v.estado === "en_curso") ?? null;
}

export function puedeIniciarVuelta(vueltas: readonly VueltaResumen[]): boolean {
  return vueltaEnCurso(vueltas) === null;
}

/** Transiciones de estado permitidas para cada rol. */
export function puedeCambiarEstado(rol: Rol, de: EstadoVuelta, a: EstadoVuelta): boolean {
  if (rol === "admin") return de !== a;
  // El conductor finaliza (o reabre si se equivocó), pero nunca toca una cerrada.
  return (de === "en_curso" && a === "finalizada") || (de === "finalizada" && a === "en_curso");
}

/** Mientras no esté cerrada, los conductores asignados pueden registrar y corregir. */
export function admiteRegistros(estado: EstadoVuelta): boolean {
  return estado !== "cerrada";
}

/** Una varada no suma ni resta dinero (ver liquidar()). */
export function cuentaDinero(tipo: TipoVuelta): boolean {
  return tipo === "completa";
}

/**
 * Terminales del trayecto que aún no tienen planilla registrada (ni "sin planilla").
 * Sirve para guiar el registro terminal por terminal y avisar antes de finalizar.
 */
export function terminalesPendientes(
  sentido: Sentido,
  registradas: readonly CodigoTerminal[],
): CodigoTerminal[] {
  return terminalesConPlanilla(sentido).filter((t) => !registradas.includes(t));
}

export function esEstadoVuelta(valor: string): valor is EstadoVuelta {
  return valor === "en_curso" || valor === "finalizada" || valor === "cerrada";
}

export function esTipoVuelta(valor: string): valor is TipoVuelta {
  return valor === "completa" || valor === "varada";
}

/**
 * Qué puede hacer el admin con una vuelta.
 * - Cerrada = solo lectura; solo se cierra una finalizada (una varada también se finaliza).
 * - Una finalizada se puede reabrir (vuelve a en_curso); una cerrada, con motivo (vuelve a finalizada).
 */
export function accionesAdmin(estado: EstadoVuelta): {
  editar: boolean;
  reabrir: boolean;
  cerrar: boolean;
  reabrirCerrada: boolean;
} {
  return {
    editar: estado !== "cerrada",
    reabrir: estado === "finalizada",
    cerrar: estado === "finalizada",
    reabrirCerrada: estado === "cerrada",
  };
}

/** Trayectos que le faltan a una vuelta completa. Una varada puede quedar con uno solo. */
export function trayectosFaltantes(tipo: TipoVuelta, sentidos: readonly Sentido[]): Sentido[] {
  if (tipo === "varada") return sentidos.length ? [] : ["ida"];
  return (["ida", "regreso"] as const).filter((s) => !sentidos.includes(s));
}
