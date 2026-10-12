// Arma, a partir de lo guardado en el celular, lo que muestra la pantalla del
// conductor: la vuelta en curso, sus trayectos y el estado de cada terminal.
// Puro (sin Dexie ni React) para poder probarlo.

import { estadoTerminales, type EstadoTerminal } from "@/lib/dominio/planillas";
import { sobrante, tramoActual, type DestinoSobrante } from "@/lib/dominio/polilla";
import type { CodigoTerminal, Sentido, Tramo } from "@/lib/dominio/ruta";
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

export type PasajeroLocal = {
  id: string;
  ocurrido_en?: string;
  trayecto_id: string;
  tramo_id: string;
  destino: CodigoTerminal;
  monto_cobrado: number;
  facturado: boolean;
  terminal_facturacion?: CodigoTerminal | null;
  monto_facturado: number;
  destino_sobrante: DestinoSobrante;
};

export type EncomiendaLocal = {
  id: string;
  ocurrido_en?: string;
  trayecto_id: string;
  recibida_en_terminal?: CodigoTerminal | null;
  recibida_en_tramo?: string | null;
  destino: CodigoTerminal;
  descripcion?: string | null;
  monto: number;
};

/** Un pasajero con su sobrante (registro individual: se puede mostrar al conductor). */
export type PasajeroVista = PasajeroLocal & { sobrante: number; sinEnviar: boolean };
export type EncomiendaVista = EncomiendaLocal & { sinEnviar: boolean };

export type TerminalVista = {
  codigo: CodigoTerminal;
  estado: EstadoTerminal;
  planilla: PlanillaLocal | null;
  sinEnviar: boolean;
};

export type TrayectoVista = {
  trayecto: TrayectoLocal;
  terminales: TerminalVista[];
  /** Pasajeros de vía y encomiendas, uno por uno. Nunca se suman en el celular. */
  pasajeros: PasajeroVista[];
  encomiendas: EncomiendaVista[];
  /** Tramo por el que va la buseta (para preseleccionarlo al registrar polilla). */
  tramoActual: Tramo;
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

/** En el orden en que pasaron (hora del celular). */
const porHora = (a: { ocurrido_en?: string }, b: { ocurrido_en?: string }) =>
  (a.ocurrido_en ?? "").localeCompare(b.ocurrido_en ?? "");

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
  const pasajerosTodos = deTabla<PasajeroLocal>(registros, "polilla_pasajeros");
  const encomiendasTodas = deTabla<EncomiendaLocal>(registros, "encomiendas");

  const armarTrayecto = (sentido: Sentido): TrayectoVista | null => {
    const trayecto = trayectos.find((t) => t.sentido === sentido);
    if (!trayecto) return null;
    // Si se varó, solo cuentan las terminales anteriores a donde terminó.
    const delTrayecto = planillas.filter((p) => p.trayecto_id === trayecto.id);
    const terminales = estadoTerminales(sentido, trayecto.terminal_fin, delTrayecto).map(
      (t): TerminalVista => ({ ...t, sinEnviar: t.planilla ? sinEnviar.has(t.planilla.id) : false }),
    );
    // El sobrante se calcula aquí: un registro recién creado no trae la columna generada.
    const pasajeros = pasajerosTodos
      .filter((p) => p.trayecto_id === trayecto.id)
      .sort(porHora)
      .map((p): PasajeroVista => ({
        ...p,
        sobrante: sobrante({ montoCobrado: p.monto_cobrado, montoFacturado: p.monto_facturado }),
        sinEnviar: sinEnviar.has(p.id),
      }));
    const encomiendas = encomiendasTodas
      .filter((e) => e.trayecto_id === trayecto.id)
      .sort(porHora)
      .map((e): EncomiendaVista => ({ ...e, sinEnviar: sinEnviar.has(e.id) }));
    const registradas = terminales.filter((t) => t.estado !== "pendiente").map((t) => t.codigo);
    return {
      trayecto,
      terminales,
      pasajeros,
      encomiendas,
      tramoActual: tramoActual(sentido, registradas),
      sinEnviar:
        sinEnviar.has(trayecto.id) ||
        terminales.some((t) => t.sinEnviar) ||
        pasajeros.some((p) => p.sinEnviar) ||
        encomiendas.some((e) => e.sinEnviar),
    };
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
