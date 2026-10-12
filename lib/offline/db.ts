// Base local del celular (IndexedDB con Dexie). Todo lo que registra el conductor
// se guarda aquí primero; la cola lo envía cuando hay señal.

import Dexie, { type EntityTable } from "dexie";
import type { Operacion, Tabla } from "./operaciones";

export type EstadoEntrada = "pendiente" | "enviando" | "error";

/** Operación pendiente de enviar. Se borra cuando el servidor la confirma. */
export type EntradaCola = {
  seq?: number;
  /** UUID de la entrada: el servidor responde por esta clave. */
  clave: string;
  operacion: Operacion;
  estado: EstadoEntrada;
  intentos: number;
  error: string | null;
  creadoEn: string;
};

/** Copia local de lo registrado, para mostrarlo sin señal. */
export type RegistroLocal = {
  id: string;
  tabla: Tabla;
  datos: Record<string, unknown>;
  anulado: boolean;
  actualizadoEn: string;
};

export type EstadoFoto = "pendiente" | "error";

/** Foto comprimida esperando subir a Storage (bucket evidencias). */
export type FotoPendiente = {
  /** Ruta final en el bucket: {uid}/{uuid}.webp */
  ruta: string;
  blob: Blob;
  estado: EstadoFoto;
  intentos: number;
  error: string | null;
  creadoEn: string;
};

/** Valores sueltos: uid de la sesión, vuelta en curso, catálogos en caché. */
export type Ajuste = { clave: string; valor: unknown };

export type BaseLocal = Dexie & {
  cola: EntityTable<EntradaCola, "seq">;
  registros: EntityTable<RegistroLocal, "id">;
  fotos: EntityTable<FotoPendiente, "ruta">;
  ajustes: EntityTable<Ajuste, "clave">;
};

export function crearBaseLocal(nombre = "flotacontrol"): BaseLocal {
  const db = new Dexie(nombre) as BaseLocal;
  db.version(1).stores({
    cola: "++seq, &clave, estado",
    registros: "id, tabla",
    fotos: "ruta, estado",
    ajustes: "clave",
  });
  return db;
}

let instancia: BaseLocal | undefined;

/** Base local del navegador (una por pestaña). */
export function baseLocal(): BaseLocal {
  instancia ??= crearBaseLocal();
  return instancia;
}
