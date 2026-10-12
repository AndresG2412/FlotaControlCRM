// Liquidación y cuadre de una vuelta. La fuente de verdad es la vista SQL
// reporte_vueltas; estas funciones fijan la regla en tests y deben dar lo mismo.
//
// El conductor maneja el dinero de la vuelta: recibe el neto en cada terminal,
// cobra polilla y encomiendas, paga los gastos en ruta (ACPM, ligas, peajes, su
// pago...) y al final entrega el resto al dueño.

import type { Pesos } from "./dinero";
import { sumar } from "./dinero";
import { repartoPasajero, type PasajeroPolilla } from "./polilla";

export type TipoVuelta = "completa" | "varada";

export type GastoFijo = { valor: Pesos; sePagaEnRuta: boolean };

export type DatosVuelta = {
  tipo: TipoVuelta;
  /** Neto de cada planilla emitida y activa. */
  netosPlanillas: readonly Pesos[];
  pasajerosPolilla: readonly PasajeroPolilla[];
  encomiendas: readonly Pesos[];
  gastosFijos: readonly GastoFijo[];
  /** Todos los gastos variables los paga el conductor con el dinero de la vuelta. */
  gastosVariables: readonly Pesos[];
};

export type Liquidacion = {
  ingresoPlanillas: Pesos;
  ingresoPolilla: Pesos;
  ingresoEncomiendas: Pesos;
  ingresoReal: Pesos;
  quedoConductor: Pesos;
  gastosFijos: Pesos;
  gastosVariables: Pesos;
  gastosMinimos: Pesos;
  /** Ganancia (positiva) o pérdida (negativa). */
  liquidacion: Pesos;
  efectivoEsperado: Pesos;
};

const EN_CERO: Liquidacion = {
  ingresoPlanillas: 0,
  ingresoPolilla: 0,
  ingresoEncomiendas: 0,
  ingresoReal: 0,
  quedoConductor: 0,
  gastosFijos: 0,
  gastosVariables: 0,
  gastosMinimos: 0,
  liquidacion: 0,
  efectivoEsperado: 0,
};

export function liquidar(v: DatosVuelta): Liquidacion {
  // Una varada solo se registra: todo en 0, no se liquida.
  if (v.tipo === "varada") return EN_CERO;

  const repartos = v.pasajerosPolilla.map(repartoPasajero);
  const ingresoPlanillas = sumar(v.netosPlanillas);
  const ingresoPolilla = sumar(repartos.map((r) => r.polilla));
  const ingresoEncomiendas = sumar(v.encomiendas);
  const ingresoReal = ingresoPlanillas + ingresoPolilla + ingresoEncomiendas;

  const gastosFijos = sumar(v.gastosFijos.map((g) => g.valor));
  const fijosEnRuta = sumar(v.gastosFijos.filter((g) => g.sePagaEnRuta).map((g) => g.valor));
  const gastosVariables = sumar(v.gastosVariables);
  const gastosMinimos = gastosFijos + gastosVariables;

  return {
    ingresoPlanillas,
    ingresoPolilla,
    ingresoEncomiendas,
    ingresoReal,
    quedoConductor: sumar(repartos.map((r) => r.quedoConductor)),
    gastosFijos,
    gastosVariables,
    gastosMinimos,
    liquidacion: ingresoReal - gastosMinimos,
    efectivoEsperado: ingresoReal - gastosVariables - fijosEnRuta,
  };
}

/** Diferencia del cuadre: positiva si entregaron de más, negativa si falta. */
export function diferenciaCuadre(efectivoEntregado: Pesos, efectivoEsperado: Pesos): Pesos {
  return efectivoEntregado - efectivoEsperado;
}
