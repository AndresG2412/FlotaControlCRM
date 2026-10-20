// Acciones que hace el conductor en la vuelta. Todas funcionan sin señal: validan,
// guardan en el celular y quedan en la cola. Sin React.

import { hoyEnBogota } from "@/lib/dominio/fechas";
import type { CodigoTerminal, Sentido } from "@/lib/dominio/ruta";
import { puedeIniciarVuelta } from "@/lib/dominio/vuelta";
import { cambiarEstadoVuelta, guardar } from "./cola";
import type { BaseLocal } from "./db";
import type { EncomiendaLocal, GastoLocal, PasajeroLocal, PlanillaLocal, TrayectoLocal, VueltaLocal } from "./vista";

const ahora = () => new Date().toISOString();

export class YaHayVueltaEnCurso extends Error {
  constructor() {
    super("Ya hay una vuelta en curso: termina esa antes de empezar otra");
  }
}

export async function iniciarVuelta(
  db: BaseLocal,
  datos: {
    uid: string;
    busetaId: string;
    puesto: "florencia" | "pitalito";
    companeroId: string | null;
    tipo?: "completa" | "varada";
  },
): Promise<string> {
  const vueltas = (await db.registros.where("tabla").equals("vueltas").toArray()).map(
    (r) => r.datos as VueltaLocal,
  );
  if (!puedeIniciarVuelta(vueltas.filter((v) => v.buseta_id === datos.busetaId))) throw new YaHayVueltaEnCurso();

  const id = crypto.randomUUID();
  const yo = datos.uid;
  const otro = datos.companeroId && datos.companeroId !== yo ? datos.companeroId : null;
  await guardar(db, "vueltas", {
    id,
    ocurrido_en: ahora(),
    buseta_id: datos.busetaId,
    tipo: datos.tipo ?? "completa",
    fecha_inicio: hoyEnBogota(),
    conductor_florencia_id: datos.puesto === "florencia" ? yo : otro,
    conductor_pitalito_id: datos.puesto === "pitalito" ? yo : otro,
  }, { estado: "en_curso" }); // el estado lo pone la base; el celular lo necesita para mostrarla
  return id;
}

export async function iniciarTrayecto(db: BaseLocal, vueltaId: string, sentido: Sentido): Promise<string> {
  const id = crypto.randomUUID();
  await guardar(db, "trayectos", {
    id,
    ocurrido_en: ahora(),
    vuelta_id: vueltaId,
    sentido,
    fecha: hoyEnBogota(),
    hora_salida: new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Bogota",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date()),
  });
  return id;
}

/** Crea o corrige la planilla de una terminal (una por terminal y trayecto). */
export async function guardarPlanilla(
  db: BaseLocal,
  trayecto: Pick<TrayectoLocal, "id" | "sentido">,
  datos: Omit<PlanillaLocal, "id" | "trayecto_id"> & { id?: string },
): Promise<string> {
  const id = datos.id ?? crypto.randomUUID();
  await guardar(db, "planillas", {
    ...datos,
    id,
    ocurrido_en: ahora(),
    trayecto_id: trayecto.id,
    sentido: trayecto.sentido,
    neto: datos.emitida ? datos.neto : null,
    motivo_sin_planilla: datos.emitida ? null : datos.motivo_sin_planilla,
  });
  return id;
}

/**
 * Crea o corrige un pasajero de vía. Si pasa por una terminal se factura en la
 * primera (lo valida el esquema); el monto facturado lo digita el conductor.
 */
export async function guardarPasajero(
  db: BaseLocal,
  trayecto: Pick<TrayectoLocal, "id" | "sentido">,
  datos: Omit<PasajeroLocal, "id" | "trayecto_id"> & { id?: string },
): Promise<string> {
  const id = datos.id ?? crypto.randomUUID();
  await guardar(db, "polilla_pasajeros", {
    ...datos,
    id,
    ocurrido_en: ahora(),
    trayecto_id: trayecto.id,
    sentido: trayecto.sentido,
    terminal_facturacion: datos.facturado ? datos.terminal_facturacion : null,
    monto_facturado: datos.facturado ? datos.monto_facturado : 0,
  });
  return id;
}

/** Crea o corrige una encomienda (monto = neto final que recibe la vuelta). */
export async function guardarEncomienda(
  db: BaseLocal,
  trayecto: Pick<TrayectoLocal, "id" | "sentido">,
  datos: Omit<EncomiendaLocal, "id" | "trayecto_id"> & { id?: string },
): Promise<string> {
  const id = datos.id ?? crypto.randomUUID();
  await guardar(db, "encomiendas", {
    ...datos,
    id,
    ocurrido_en: ahora(),
    trayecto_id: trayecto.id,
    sentido: trayecto.sentido,
    recibida_en_terminal: datos.recibida_en_terminal ?? null,
    recibida_en_tramo: datos.recibida_en_terminal ? null : (datos.recibida_en_tramo ?? null),
    descripcion: datos.descripcion?.trim() || null,
  });
  return id;
}

/**
 * Crea o corrige un gasto variable de la vuelta (ACPM, liga, otro gasto, arreglo).
 * Si hay un trayecto abierto se enlaza; la foto del recibo ya viene guardada.
 */
export async function guardarGasto(
  db: BaseLocal,
  vuelta: Pick<VueltaLocal, "id">,
  datos: Omit<GastoLocal, "id" | "vuelta_id"> & { id?: string },
): Promise<string> {
  const id = datos.id ?? crypto.randomUUID();
  await guardar(db, "gastos_variables", {
    ...datos,
    id,
    ocurrido_en: ahora(),
    vuelta_id: vuelta.id,
    trayecto_id: datos.trayecto_id ?? null,
    descripcion: datos.descripcion?.trim() || null,
    lugar: datos.lugar?.trim() || null,
    // Solo la liga lleva terminal y solo el ACPM lleva galones.
    terminal: datos.tipo === "liga" ? (datos.terminal ?? null) : null,
    galones: datos.tipo === "acpm" ? (datos.galones ?? null) : null,
  });
  return id;
}

/**
 * La buseta se varó: el trayecto terminó en una terminal antes de la final y la
 * vuelta pasa a tipo varada (todo queda en $0).
 */
export async function marcarVarada(
  db: BaseLocal,
  vuelta: VueltaLocal,
  trayecto: TrayectoLocal,
  terminalFin: CodigoTerminal,
) {
  await guardar(db, "trayectos", { ...trayecto, ocurrido_en: ahora(), terminal_fin: terminalFin });
  await guardar(db, "vueltas", { ...vuelta, ocurrido_en: ahora(), tipo: "varada" });
}

export async function finalizarVuelta(db: BaseLocal, vueltaId: string) {
  await cambiarEstadoVuelta(db, vueltaId, "finalizada");
}
