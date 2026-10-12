// Polilla: pasajeros recogidos en la vía. Regla confirmada con el dueño
// (CLAUDE.md, Módulo 2); no cambiar sin confirmar.

import type { Pesos } from "./dinero";
import type { FechaISO } from "./fechas";
import type { CodigoTerminal } from "./ruta";
import { terminalesDeFacturacion } from "./ruta";

export type DestinoSobrante = "polilla" | "conductor";

export type PasajeroPolilla = {
  montoCobrado: Pesos;
  /** 0 si se bajó antes de la siguiente terminal. */
  montoFacturado: Pesos;
  destinoSobrante: DestinoSobrante;
};

export function sobrante(p: Pick<PasajeroPolilla, "montoCobrado" | "montoFacturado">): Pesos {
  return p.montoCobrado - p.montoFacturado;
}

/** Cuánto del pasajero entra a la caja de la vuelta y cuánto se quedó el conductor. */
export function repartoPasajero(p: PasajeroPolilla): { polilla: Pesos; quedoConductor: Pesos } {
  const s = sobrante(p);
  return p.destinoSobrante === "polilla"
    ? { polilla: s, quedoConductor: 0 }
    : { polilla: 0, quedoConductor: s };
}

export type Tarifa = {
  origen: CodigoTerminal;
  destino: CodigoTerminal;
  precio: Pesos;
  vigenteDesde: FechaISO;
};

/** Tarifa vigente en una fecha (la de vigencia más reciente que no sea futura). */
export function tarifaVigente(
  tarifas: readonly Tarifa[],
  origen: CodigoTerminal,
  destino: CodigoTerminal,
  fecha: FechaISO,
): Tarifa | undefined {
  return tarifas
    .filter((t) => t.origen === origen && t.destino === destino && t.vigenteDesde <= fecha)
    .sort((a, b) => b.vigenteDesde.localeCompare(a.vigenteDesde))[0];
}

/**
 * Sugerencia para el formulario de polilla: si el pasajero pasó por una terminal,
 * dónde se factura y cuánto se paga en taquilla (desde esa terminal al destino).
 * El conductor puede corregir el monto; el valor que digita manda.
 */
export function sugerirFacturacion(
  tarifas: readonly Tarifa[],
  tramoId: string,
  destino: CodigoTerminal,
  fecha: FechaISO,
): { terminal: CodigoTerminal; monto: Pesos | null } | null {
  const terminal = terminalesDeFacturacion(tramoId, destino)[0];
  if (!terminal) return null;
  return { terminal, monto: tarifaVigente(tarifas, terminal, destino, fecha)?.precio ?? null };
}
