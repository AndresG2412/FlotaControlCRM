// Arma, a partir de lo guardado en el celular, lo que muestra la pantalla del
// conductor: la vuelta en curso, sus trayectos y el estado de cada terminal.
// Puro (sin Dexie ni React) para poder probarlo.

import { terminalesConPlanilla, type CodigoTerminal, type Sentido } from "@/lib/dominio/ruta";
import type { RegistroLocal } from "./db";

export type VueltaLocal = {
  id: string;
  buseta_id: string;
  estado: "en_curso" | "finalizada" | "cerrada";
  tipo: "completa" | "varada";
  fecha_inicio: string;
  conductor_florencia_id: string | null;
  conductor_pitalito_id: string | null;
  notas?: string | null;
};

export type TrayectoLocal = {
  id: string;
  vuelta_id: string;
  sentido: Sentido;
  fecha: string;
  hora_salida?: string | null;
  terminal_fin?: CodigoTerminal | null;
};

export type PlanillaLocal = {
  id: string;
  trayecto_id: string;
  terminal: CodigoTerminal;
  emitida: boolean;
  neto?: number | null;
  numero?: string | null;
  pasajeros?: number | null;
  motivo_sin_planilla?: string | null;
  foto_path?: string | null;
};

export type EstadoTerminal = "pendiente" | "registrada" | "sin_planilla";

export type TerminalVista = {
  codigo: CodigoTerminal;
  estado: EstadoTerminal;
  planilla: PlanillaLocal | null;
  sinEnviar: boolean;
};

export type TrayectoVista = {
  trayecto: TrayectoLocal;
  terminales: TerminalVista[];
  sinEnviar: boolean;
};

export type VistaVuelta = {
  vuelta: VueltaLocal;
  /** El usuario actual va en esta vuelta (si no, puede unirse). */
  asignado: boolean;
  puesto: "florencia" | "pitalito" | null;
  ida: TrayectoVista | null;
  regreso: TrayectoVista | null;
  /** Terminales sin registrar en los trayectos abiertos: avisar antes de finalizar. */
  terminalesPendientes: number;
  sinEnviar: boolean;
};

const deTabla = <T>(registros: readonly RegistroLocal[], tabla: RegistroLocal["tabla"]) =>
  registros.filter((r) => r.tabla === tabla && !r.anulado).map((r) => r.datos as T);

/** Vuelta en curso según el celular (o null). Solo puede haber una por buseta. */
export function armarVista(
  registros: readonly RegistroLocal[],
  uid: string,
  sinEnviar: ReadonlySet<string> = new Set(),
): VistaVuelta | null {
  const vuelta = deTabla<VueltaLocal>(registros, "vueltas").find((v) => v.estado === "en_curso");
  if (!vuelta) return null;

  const trayectos = deTabla<TrayectoLocal>(registros, "trayectos").filter((t) => t.vuelta_id === vuelta.id);
  const planillas = deTabla<PlanillaLocal>(registros, "planillas");

  const armarTrayecto = (sentido: Sentido): TrayectoVista | null => {
    const trayecto = trayectos.find((t) => t.sentido === sentido);
    if (!trayecto) return null;
    // Si se varó, solo cuentan las terminales anteriores a donde terminó.
    let codigos = terminalesConPlanilla(sentido);
    if (trayecto.terminal_fin) {
      const fin = codigos.indexOf(trayecto.terminal_fin);
      if (fin >= 0) codigos = codigos.slice(0, fin);
    }
    const terminales = codigos.map((codigo): TerminalVista => {
      const planilla = planillas.find((p) => p.trayecto_id === trayecto.id && p.terminal === codigo) ?? null;
      return {
        codigo,
        planilla,
        estado: !planilla ? "pendiente" : planilla.emitida ? "registrada" : "sin_planilla",
        sinEnviar: planilla ? sinEnviar.has(planilla.id) : false,
      };
    });
    return { trayecto, terminales, sinEnviar: sinEnviar.has(trayecto.id) || terminales.some((t) => t.sinEnviar) };
  };

  const ida = armarTrayecto("ida");
  const regreso = armarTrayecto("regreso");
  const puesto =
    vuelta.conductor_florencia_id === uid ? "florencia" : vuelta.conductor_pitalito_id === uid ? "pitalito" : null;

  return {
    vuelta,
    asignado: puesto !== null,
    puesto,
    ida,
    regreso,
    terminalesPendientes: [ida, regreso].reduce(
      (n, t) => n + (t?.terminales.filter((x) => x.estado === "pendiente").length ?? 0),
      0,
    ),
    sinEnviar: sinEnviar.has(vuelta.id) || Boolean(ida?.sinEnviar || regreso?.sinEnviar),
  };
}
