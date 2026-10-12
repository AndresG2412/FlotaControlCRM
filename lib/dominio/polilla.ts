// Polilla: pasajeros recogidos en la vía y encomiendas. Regla confirmada con el
// dueño (CLAUDE.md, Módulo 2); no cambiar sin confirmar.
//
// Sin tabla de tarifas (decisión del dueño): el conductor digita cuánto pagó en
// taquilla al facturar, y a conciencia dice si el sobrante va a la caja o se lo
// quedó. En la terminal el tiquete se hace por lo que pagó el pasajero, así que lo
// facturado nunca supera lo cobrado.

import type { Pesos } from "./dinero";
import {
  buscarTramo,
  terminalesConPlanilla,
  terminalesDeFacturacion,
  tramosDe,
  type CodigoTerminal,
  type Sentido,
  type Tramo,
} from "./ruta";

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

/**
 * Terminal donde se factura al pasajero: la primera que pasa sin bajarse. null si
 * se baja en la siguiente terminal (no se factura). Facturar es obligatorio si
 * sigue en el bus, porque allí cuentan pasajeros a mano.
 */
export function terminalDeFacturacion(tramoId: string, destino: CodigoTerminal): CodigoTerminal | null {
  return terminalesDeFacturacion(tramoId, destino)[0] ?? null;
}

/**
 * Tramo en el que va la buseta según las terminales ya registradas (con o sin
 * planilla): el que sale de la última registrada. Si no hay ninguna, el primero.
 * Sirve para preseleccionar el tramo al registrar polilla.
 */
export function tramoActual(sentido: Sentido, terminalesRegistradas: readonly CodigoTerminal[]): Tramo {
  const tramos = tramosDe(sentido);
  const salidas = terminalesConPlanilla(sentido);
  const ultima = [...salidas].reverse().find((t) => terminalesRegistradas.includes(t));
  return tramos.find((t) => t.origen === ultima) ?? tramos[0];
}

/** Lugares donde se puede recibir una encomienda en un sentido: terminales de salida o un tramo. */
export type LugarEncomienda = { terminal: CodigoTerminal } | { tramo: string };

/**
 * Destinos válidos para una encomienda: más adelante que donde se recibió, en el
 * sentido del trayecto. Recibida en terminal: cualquier terminal posterior.
 * Recibida en la vía: el destino del tramo o más adelante.
 */
export function destinosDeEncomienda(sentido: Sentido, lugar: LugarEncomienda): CodigoTerminal[] {
  const tramos = tramosDe(sentido);
  if ("terminal" in lugar) {
    const desde = tramos.find((t) => t.origen === lugar.terminal);
    return desde ? tramos.filter((t) => t.orden >= desde.orden).map((t) => t.destino) : [];
  }
  const tramo = buscarTramo(lugar.tramo);
  if (!tramo || tramo.sentido !== sentido) return [];
  return tramos.filter((t) => t.orden >= tramo.orden).map((t) => t.destino);
}
