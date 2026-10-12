// Estado de cada terminal de un trayecto según sus planillas. Lo usan la pantalla
// del conductor (desde lo local) y el panel del admin (desde el servidor).

import { terminalesConPlanilla, type CodigoTerminal, type Sentido } from "./ruta";

export type EstadoTerminal = "pendiente" | "registrada" | "sin_planilla";

export type PlanillaBase = {
  terminal: CodigoTerminal;
  emitida: boolean;
};

export type TerminalConPlanilla<P extends PlanillaBase> = {
  codigo: CodigoTerminal;
  estado: EstadoTerminal;
  planilla: P | null;
};

/**
 * Terminales que debían emitir planilla en el trayecto. Si se varó (terminal_fin),
 * solo cuentan las anteriores a donde terminó.
 */
export function terminalesDelTrayecto(sentido: Sentido, terminalFin?: CodigoTerminal | null): CodigoTerminal[] {
  const codigos = terminalesConPlanilla(sentido);
  if (!terminalFin) return codigos;
  const fin = codigos.indexOf(terminalFin);
  return fin >= 0 ? codigos.slice(0, fin) : codigos;
}

/**
 * Cada terminal con su planilla vigente (las anuladas no deben venir aquí):
 * registrada, "sin planilla" con motivo o pendiente de registrar.
 */
export function estadoTerminales<P extends PlanillaBase>(
  sentido: Sentido,
  terminalFin: CodigoTerminal | null | undefined,
  planillas: readonly P[],
): TerminalConPlanilla<P>[] {
  return terminalesDelTrayecto(sentido, terminalFin).map((codigo) => {
    const planilla = planillas.find((p) => p.terminal === codigo) ?? null;
    return {
      codigo,
      planilla,
      estado: !planilla ? "pendiente" : planilla.emitida ? "registrada" : "sin_planilla",
    };
  });
}

export type ConteoPlanillas = Record<EstadoTerminal, number>;

export function contarPlanillas(terminales: readonly { estado: EstadoTerminal }[]): ConteoPlanillas {
  const conteo: ConteoPlanillas = { pendiente: 0, registrada: 0, sin_planilla: 0 };
  for (const t of terminales) conteo[t.estado] += 1;
  return conteo;
}

/** Conteo de planillas de toda una vuelta (lista del admin). */
export function resumenPlanillas(
  trayectos: readonly { id: string; sentido: Sentido; terminal_fin?: CodigoTerminal | null }[],
  planillas: readonly (PlanillaBase & { trayecto_id: string })[],
): ConteoPlanillas {
  return contarPlanillas(
    trayectos.flatMap((t) =>
      estadoTerminales(
        t.sentido,
        t.terminal_fin,
        planillas.filter((p) => p.trayecto_id === t.id),
      ),
    ),
  );
}
