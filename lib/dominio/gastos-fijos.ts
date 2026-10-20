// Gastos fijos por vuelta: configuración versionada por fecha de vigencia.
// fijosVigentes() debe dar lo mismo que el trigger cargar_gastos_fijos de la base.

import type { FechaISO } from "./fechas";
import type { Pesos } from "./dinero";
import { sumar } from "./dinero";

export type GastoFijoConfig = {
  concepto: string;
  valor: Pesos;
  se_paga_en_ruta: boolean;
  vigente_desde: FechaISO;
};

/**
 * Último valor de cada concepto con vigente_desde <= fecha, sin los de valor 0
 * (un valor 0 es "quitar el concepto desde esa fecha"). Ordenado por concepto.
 */
export function fijosVigentes(config: readonly GastoFijoConfig[], fecha: FechaISO): GastoFijoConfig[] {
  const ultimo = new Map<string, GastoFijoConfig>();
  for (const g of config) {
    if (g.vigente_desde > fecha) continue;
    const actual = ultimo.get(g.concepto);
    if (!actual || g.vigente_desde > actual.vigente_desde) ultimo.set(g.concepto, g);
  }
  return [...ultimo.values()].filter((g) => g.valor > 0).sort((a, b) => a.concepto.localeCompare(b.concepto, "es"));
}

export function totalFijos(fijos: readonly { valor: Pesos }[]): Pesos {
  return sumar(fijos.map((g) => g.valor));
}

/** Historial de cada concepto, del cambio más reciente al más antiguo. */
export function historialPorConcepto(config: readonly GastoFijoConfig[]): Map<string, GastoFijoConfig[]> {
  const mapa = new Map<string, GastoFijoConfig[]>();
  for (const g of config) mapa.set(g.concepto, [...(mapa.get(g.concepto) ?? []), g]);
  for (const lista of mapa.values()) lista.sort((a, b) => b.vigente_desde.localeCompare(a.vigente_desde));
  return new Map([...mapa.entries()].sort(([a], [b]) => a.localeCompare(b, "es")));
}
