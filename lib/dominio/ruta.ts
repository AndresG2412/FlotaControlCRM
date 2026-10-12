// Catálogo fijo de la ruta (igual a la migración datos_iniciales). Vive también
// aquí para que la app del conductor funcione sin señal.

export type Sentido = "ida" | "regreso";
export type CodigoTerminal = "florencia" | "pitalito" | "popayan" | "cali";

export type Tramo = {
  id: string;
  sentido: Sentido;
  orden: 1 | 2 | 3;
  origen: CodigoTerminal;
  destino: CodigoTerminal;
};

export const TERMINALES: Record<CodigoTerminal, string> = {
  florencia: "Florencia",
  pitalito: "Pitalito",
  popayan: "Popayán",
  cali: "Cali",
};

export const TRAMOS: readonly Tramo[] = [
  { id: "ida-1", sentido: "ida", orden: 1, origen: "florencia", destino: "pitalito" },
  { id: "ida-2", sentido: "ida", orden: 2, origen: "pitalito", destino: "popayan" },
  { id: "ida-3", sentido: "ida", orden: 3, origen: "popayan", destino: "cali" },
  { id: "regreso-1", sentido: "regreso", orden: 1, origen: "cali", destino: "popayan" },
  { id: "regreso-2", sentido: "regreso", orden: 2, origen: "popayan", destino: "pitalito" },
  { id: "regreso-3", sentido: "regreso", orden: 3, origen: "pitalito", destino: "florencia" },
];

export function tramosDe(sentido: Sentido): Tramo[] {
  return TRAMOS.filter((t) => t.sentido === sentido);
}

export function buscarTramo(id: string): Tramo | undefined {
  return TRAMOS.find((t) => t.id === id);
}

/** Terminales que emiten planilla en un trayecto: todas menos la final. */
export function terminalesConPlanilla(sentido: Sentido): CodigoTerminal[] {
  return tramosDe(sentido).map((t) => t.origen);
}

/** Destinos posibles para un pasajero que subió en un tramo. */
export function destinosPosibles(tramoId: string): CodigoTerminal[] {
  const tramo = buscarTramo(tramoId);
  if (!tramo) return [];
  return tramosDe(tramo.sentido)
    .filter((t) => t.orden >= tramo.orden)
    .map((t) => t.destino);
}

/**
 * Terminales donde se tuvo que facturar al pasajero: las que pasó sin bajarse,
 * después de subir y antes de su destino. La primera es donde se factura.
 */
export function terminalesDeFacturacion(tramoId: string, destino: CodigoTerminal): CodigoTerminal[] {
  const tramo = buscarTramo(tramoId);
  if (!tramo) return [];
  const tramos = tramosDe(tramo.sentido);
  const ordenDestino = tramos.find((t) => t.destino === destino)?.orden;
  if (ordenDestino === undefined || ordenDestino < tramo.orden) return [];
  return tramos.filter((t) => t.orden > tramo.orden && t.orden <= ordenDestino).map((t) => t.origen);
}

export function esTerminal(valor: string | null | undefined): valor is CodigoTerminal {
  return valor != null && valor in TERMINALES;
}

export function esSentido(valor: string): valor is Sentido {
  return valor === "ida" || valor === "regreso";
}
