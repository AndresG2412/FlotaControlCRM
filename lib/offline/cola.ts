// Cola de sincronización. Reglas (CLAUDE.md, PWA offline-first):
// - Todo se guarda primero en el celular y nada se pierde si se cierra la app.
// - Se envía en orden (FIFO): una vuelta antes que sus trayectos y registros.
// - Reenviar no duplica: el servidor hace upsert por el UUID del registro.
// - Un rechazo definitivo queda en "error", visible; nunca se borra solo.

import type { BaseLocal, EntradaCola } from "./db";
import {
  ESQUEMAS,
  esReintentable,
  idDeOperacion,
  MAX_OPERACIONES_POR_LOTE,
  type Lote,
  type Operacion,
  type ResultadoOperacion,
  type Tabla,
  type TablaAnulable,
} from "./operaciones";

const ahora = () => new Date().toISOString();

async function encolar(db: BaseLocal, operacion: Operacion) {
  await db.cola.add({
    clave: crypto.randomUUID(),
    operacion,
    estado: "pendiente",
    intentos: 0,
    error: null,
    creadoEn: ahora(),
  });
}

/**
 * Guarda (crea o corrige) un registro. Valida antes de encolar para que el
 * conductor vea el error en el formulario y no después, al sincronizar.
 * Lanza ZodError si los datos no son válidos.
 *
 * El espejo local conserva los campos que ya tenía (estado, registrado_por...) y
 * suma `soloLocal`, que se muestra en el celular pero no se envía.
 */
export async function guardar(
  db: BaseLocal,
  tabla: Tabla,
  datos: Record<string, unknown>,
  soloLocal: Record<string, unknown> = {},
) {
  const valido = ESQUEMAS[tabla].parse(datos) as Record<string, unknown> & { id: string };
  await db.transaction("rw", db.cola, db.registros, async () => {
    const previo = await db.registros.get(valido.id);
    await db.registros.put({
      id: valido.id,
      tabla,
      datos: { ...previo?.datos, ...valido, ...soloLocal },
      anulado: false,
      actualizadoEn: ahora(),
    });
    await encolar(db, { tipo: "guardar", tabla, datos: valido });
  });
}

/** "Eliminar" en la interfaz: anula el registro con un motivo. */
export async function anular(db: BaseLocal, tabla: TablaAnulable, id: string, motivo: string) {
  await db.transaction("rw", db.cola, db.registros, async () => {
    await db.registros.update(id, { anulado: true, actualizadoEn: ahora() });
    await encolar(db, { tipo: "anular", tabla, id, motivo_anulacion: motivo });
  });
}

/** El conductor finaliza la vuelta (o la reabre si se equivocó). */
export async function cambiarEstadoVuelta(db: BaseLocal, id: string, estado: "en_curso" | "finalizada") {
  await db.transaction("rw", db.cola, db.registros, async () => {
    const vuelta = await db.registros.get(id);
    if (vuelta) {
      await db.registros.update(id, { datos: { ...vuelta.datos, estado }, actualizadoEn: ahora() });
    }
    await encolar(db, { tipo: "estado_vuelta", id, estado });
  });
}

/** Lo que la interfaz muestra siempre: cuánto falta por enviar y cuánto falló. */
export async function resumenCola(db: BaseLocal) {
  const [pendientes, errores, fotos] = await Promise.all([
    db.cola.where("estado").anyOf("pendiente", "enviando").count(),
    db.cola.where("estado").equals("error").count(),
    db.fotos.count(),
  ]);
  return { pendientes, errores, fotos };
}

/** Ids de registros con algo sin enviar (para marcarlos en las listas). */
export async function idsSinSincronizar(db: BaseLocal): Promise<Set<string>> {
  const entradas = await db.cola.toArray();
  return new Set(entradas.map((e) => idDeOperacion(e.operacion)).filter((id): id is string => id !== null));
}

/** Vuelve a intentar lo que quedó en error (después de corregirlo o de reasignar la vuelta). */
export async function reintentarErrores(db: BaseLocal) {
  await db.cola.where("estado").equals("error").modify({ estado: "pendiente", error: null });
}

/**
 * Otra vuelta ya está en curso en el servidor (los dos conductores crearon una sin
 * señal). Se adopta la del servidor: lo pendiente de la vuelta local pasa a ella.
 */
export async function fusionarVuelta(db: BaseLocal, idLocal: string, idServidor: string) {
  await db.transaction("rw", db.cola, db.registros, async () => {
    await db.cola
      .filter((e) => e.operacion.tipo === "guardar" && e.operacion.tabla === "vueltas" && e.operacion.datos.id === idLocal)
      .delete();
    await db.cola.toCollection().modify((e: EntradaCola) => {
      const op = e.operacion;
      if (op.tipo === "guardar" && op.datos.vuelta_id === idLocal) {
        e.operacion = { ...op, datos: { ...op.datos, vuelta_id: idServidor } };
        if (e.estado === "error") e.estado = "pendiente";
      }
      if (op.tipo === "estado_vuelta" && op.id === idLocal) {
        e.operacion = { ...op, id: idServidor };
      }
    });
    await db.registros.toCollection().modify((r) => {
      if (r.datos.vuelta_id === idLocal) r.datos = { ...r.datos, vuelta_id: idServidor };
    });
    await db.registros.delete(idLocal);
  });
}

export type Enviar = (lote: Lote) => Promise<ResultadoOperacion[]>;

export type ResumenSincronizacion = {
  enviadas: number;
  confirmadas: number;
  errores: number;
  /** true si no hubo red o el servidor no respondió: se reintenta después. */
  sinConexion: boolean;
};

let enCurso: Promise<ResumenSincronizacion> | null = null;

/** Envía lo pendiente en lotes, en orden. Si ya hay una sincronización corriendo, la reutiliza. */
export function sincronizar(db: BaseLocal, enviar: Enviar): Promise<ResumenSincronizacion> {
  enCurso ??= sincronizarTodo(db, enviar).finally(() => {
    enCurso = null;
  });
  return enCurso;
}

async function sincronizarTodo(db: BaseLocal, enviar: Enviar): Promise<ResumenSincronizacion> {
  const total: ResumenSincronizacion = { enviadas: 0, confirmadas: 0, errores: 0, sinConexion: false };

  // Si la app se cerró a mitad de un envío, esas entradas vuelven a pendiente.
  await db.cola.where("estado").equals("enviando").modify({ estado: "pendiente" });

  for (;;) {
    const lote = await db.cola.where("estado").equals("pendiente").sortBy("seq");
    const tanda = lote.slice(0, MAX_OPERACIONES_POR_LOTE);
    if (tanda.length === 0) return total;

    const claves = tanda.map((e) => e.clave);
    await db.cola.where("clave").anyOf(claves).modify({ estado: "enviando" });

    let resultados: ResultadoOperacion[];
    try {
      resultados = await enviar({ operaciones: tanda.map((e) => ({ clave: e.clave, operacion: e.operacion })) });
    } catch {
      await db.cola.where("clave").anyOf(claves).modify({ estado: "pendiente" });
      return { ...total, sinConexion: true };
    }

    total.enviadas += tanda.length;
    let reintentar = false;
    let avance = false; // algo se confirmó, falló definitivo o se fusionó
    for (const entrada of tanda) {
      const r = resultados.find((x) => x.clave === entrada.clave);
      if (r?.ok) {
        await db.cola.where("clave").equals(entrada.clave).delete();
        total.confirmadas++;
        avance = true;
        continue;
      }
      if (r && r.codigo === "vuelta_en_curso" && r.vueltaEnCursoId && entrada.operacion.tipo === "guardar") {
        await fusionarVuelta(db, String(entrada.operacion.datos.id), r.vueltaEnCursoId);
        avance = true;
        continue; // lo pendiente cambió: la próxima vuelta del ciclo vuelve a leer la cola
      }
      if (r?.codigo === "no_procesado") {
        // El servidor se detuvo antes de llegar a esta: se reenvía tal cual.
        await db.cola.where("clave").equals(entrada.clave).modify({ estado: "pendiente" });
        continue;
      }
      const reintentable = !r || esReintentable(r.codigo);
      await db.cola.where("clave").equals(entrada.clave).modify({
        estado: reintentable ? "pendiente" : "error",
        intentos: entrada.intentos + 1,
        error: r?.mensaje ?? "El servidor no respondió por esta operación",
      });
      if (reintentable) reintentar = true;
      else {
        total.errores++;
        avance = true;
      }
    }
    // Un fallo temporal detiene todo: lo que sigue puede depender de lo que falló.
    if (reintentar || !avance) return { ...total, sinConexion: true };
  }
}
