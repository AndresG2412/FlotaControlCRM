// Reportes del admin (paso 9): por vuelta, por mes y por conductor. Los montos
// de cada vuelta salen de la vista reporte_vueltas; aquí solo se agrupan y suman
// (nunca se guardan). Puro, con tests.

import { sumar, type Pesos } from "./dinero";

export type FilaReporte = {
  vuelta_id: string;
  fecha_inicio: string;
  tipo: "completa" | "varada";
  estado: "en_curso" | "finalizada" | "cerrada";
  conductor_florencia_id: string | null;
  conductor_pitalito_id: string | null;
  ingreso_real: Pesos;
  gastos_fijos: Pesos;
  gastos_variables: Pesos;
  liquidacion: Pesos;
  quedo_conductor: Pesos;
  /** null si la vuelta no se ha cerrado (no hay cuadre). */
  diferencia_cuadre: Pesos | null;
};

/** Una vuelta en curso todavía se está llenando: no entra en los totales. */
export const cuentaEnTotales = (f: Pick<FilaReporte, "estado">) => f.estado !== "en_curso";

export type Resumen = {
  vueltas: number;
  completas: number;
  varadas: number;
  sinCerrar: number;
  ingresoReal: Pesos;
  gastosFijos: Pesos;
  gastosVariables: Pesos;
  liquidacion: Pesos;
  quedoConductor: Pesos;
  /** Suma de las diferencias de cuadre de las vueltas cerradas (negativo = faltó plata). */
  diferenciaCuadre: Pesos;
  /** Ganancia promedio por vuelta completa. */
  promedioPorVuelta: Pesos;
};

export function resumir(filas: readonly FilaReporte[]): Resumen {
  const f = filas.filter(cuentaEnTotales);
  const completas = f.filter((x) => x.tipo === "completa");
  const liquidacion = sumar(f.map((x) => x.liquidacion));
  return {
    vueltas: f.length,
    completas: completas.length,
    varadas: f.length - completas.length,
    sinCerrar: f.filter((x) => x.estado === "finalizada").length,
    ingresoReal: sumar(f.map((x) => x.ingreso_real)),
    gastosFijos: sumar(f.map((x) => x.gastos_fijos)),
    gastosVariables: sumar(f.map((x) => x.gastos_variables)),
    liquidacion,
    quedoConductor: sumar(f.map((x) => x.quedo_conductor)),
    diferenciaCuadre: sumar(f.map((x) => x.diferencia_cuadre ?? 0)),
    promedioPorVuelta: completas.length ? Math.round(liquidacion / completas.length) : 0,
  };
}

/** Resumen por mes ("YYYY-MM"), del más reciente al más antiguo. */
export function porMes(filas: readonly FilaReporte[]): { mes: string; resumen: Resumen }[] {
  const grupos = new Map<string, FilaReporte[]>();
  for (const f of filas) {
    const mes = f.fecha_inicio.slice(0, 7);
    grupos.set(mes, [...(grupos.get(mes) ?? []), f]);
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([mes, grupo]) => ({ mes, resumen: resumir(grupo) }));
}

/** Pasajero de vía cuyo sobrante se quedó el conductor (quién lo registró). */
export type QuedoRegistro = { registrado_por: string; sobrante: Pesos };

export type FilaConductor = {
  conductorId: string;
  /** Vueltas en que fue (completas o varadas, sin contar las en curso). */
  vueltas: number;
  comoFlorencia: number;
  comoPitalito: number;
  /** Liquidación de las vueltas en que fue (es de la vuelta, compartida entre los dos). */
  liquidacionVueltas: Pesos;
  /** Lo que registró como "me lo quedé" en la polilla. */
  quedoConductor: Pesos;
  /** Suma de diferencias de cuadre de sus vueltas cerradas (negativo = faltó plata). */
  diferenciaCuadre: Pesos;
};

/**
 * Por conductor: en cuántas vueltas fue y en qué puesto, cómo salieron esas
 * vueltas y cuánto registró como "me lo quedé".
 */
export function porConductor(filas: readonly FilaReporte[], quedos: readonly QuedoRegistro[]): FilaConductor[] {
  const mapa = new Map<string, FilaConductor>();
  const fila = (id: string) => {
    let c = mapa.get(id);
    if (!c) {
      c = { conductorId: id, vueltas: 0, comoFlorencia: 0, comoPitalito: 0, liquidacionVueltas: 0, quedoConductor: 0, diferenciaCuadre: 0 };
      mapa.set(id, c);
    }
    return c;
  };
  for (const f of filas.filter(cuentaEnTotales)) {
    for (const [id, puesto] of [
      [f.conductor_florencia_id, "florencia"],
      [f.conductor_pitalito_id, "pitalito"],
    ] as const) {
      if (!id) continue;
      const c = fila(id);
      c.vueltas += 1;
      if (puesto === "florencia") c.comoFlorencia += 1;
      else c.comoPitalito += 1;
      c.liquidacionVueltas += f.liquidacion;
      c.diferenciaCuadre += f.diferencia_cuadre ?? 0;
    }
  }
  for (const q of quedos) fila(q.registrado_por).quedoConductor += q.sobrante;
  return [...mapa.values()].sort((a, b) => b.vueltas - a.vueltas || b.quedoConductor - a.quedoConductor);
}

/** CSV del reporte por vuelta (separador ";" para Excel en español). */
export function csvPorVuelta(filas: readonly FilaReporte[], nombre: (id: string | null) => string): string {
  const celda = (v: string | number) => {
    const s = String(v);
    // Evita fórmulas al abrir en Excel (inyección CSV) y escapa comillas.
    const seguro = /^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s)) ? `'${s}` : s;
    return /[";\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
  };
  const encabezado = [
    "fecha", "tipo", "estado", "conductor_florencia", "conductor_pitalito", "ingreso_real", "gastos_fijos",
    "gastos_variables", "liquidacion", "quedo_conductor", "diferencia_cuadre",
  ];
  const lineas = filas.map((f) =>
    [
      f.fecha_inicio, f.tipo, f.estado, nombre(f.conductor_florencia_id), nombre(f.conductor_pitalito_id), f.ingreso_real,
      f.gastos_fijos, f.gastos_variables, f.liquidacion, f.quedo_conductor, f.diferencia_cuadre ?? "",
    ].map(celda).join(";"),
  );
  return [encabezado.join(";"), ...lineas].join("\n");
}
