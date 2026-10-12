// Contrato de sincronización entre el celular y el servidor. Lo usan la cola
// (lib/offline/cola.ts) y el endpoint app/api/sincronizar. Sin React ni Next.

import { z } from "zod";
import {
  esquemaEncomienda,
  esquemaGastoVariable,
  esquemaPlanilla,
  esquemaPolilla,
  esquemaRepuesto,
  esquemaTrayecto,
  esquemaVuelta,
} from "@/lib/validaciones/registros";

/** Tablas que el conductor puede crear o corregir sin señal. */
export const TABLAS = [
  "vueltas",
  "trayectos",
  "planillas",
  "polilla_pasajeros",
  "encomiendas",
  "gastos_variables",
  "repuestos",
] as const;
export type Tabla = (typeof TABLAS)[number];

export const ESQUEMAS = {
  vueltas: esquemaVuelta,
  trayectos: esquemaTrayecto,
  planillas: esquemaPlanilla,
  polilla_pasajeros: esquemaPolilla,
  encomiendas: esquemaEncomienda,
  gastos_variables: esquemaGastoVariable,
  repuestos: esquemaRepuesto,
} as const satisfies Record<Tabla, z.ZodType>;

/** Tablas que se anulan (no hay borrado físico) y el valor de su estado anulado. */
export const ESTADO_ANULADO = {
  planillas: "anulada",
  polilla_pasajeros: "anulado",
  encomiendas: "anulada",
  gastos_variables: "anulado",
  repuestos: "anulado",
} as const;
export type TablaAnulable = keyof typeof ESTADO_ANULADO;

const tabla = z.enum(TABLAS);
const tablaAnulable = z.enum(Object.keys(ESTADO_ANULADO) as [TablaAnulable, ...TablaAnulable[]]);

export const esquemaOperacion = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("guardar"),
    tabla,
    // Se valida con ESQUEMAS[tabla] en el servidor (y antes de encolar).
    datos: z.record(z.string(), z.unknown()),
  }),
  z.object({
    tipo: z.literal("anular"),
    tabla: tablaAnulable,
    id: z.uuid(),
    motivo_anulacion: z.string().trim().min(1).max(300),
  }),
  z.object({
    tipo: z.literal("estado_vuelta"),
    id: z.uuid(),
    estado: z.enum(["en_curso", "finalizada"]),
  }),
]);
export type Operacion = z.infer<typeof esquemaOperacion>;

export const MAX_OPERACIONES_POR_LOTE = 50;

export const esquemaLote = z.object({
  operaciones: z
    .array(z.object({ clave: z.uuid(), operacion: esquemaOperacion }))
    .min(1)
    .max(MAX_OPERACIONES_POR_LOTE),
});
export type Lote = z.infer<typeof esquemaLote>;

/**
 * Resultado por operación.
 * - invalido / sin_permiso / conflicto: no sirve reintentar igual; queda en error.
 * - vuelta_en_curso: ya hay otra vuelta abierta; la cola fusiona con ella.
 * - error_servidor: falla temporal; se reintenta más tarde.
 * - no_procesado: el servidor se detuvo antes (por un error temporal o por una
 *   vuelta_en_curso) y no la intentó; se reenvía.
 */
export type CodigoError =
  | "invalido"
  | "sin_permiso"
  | "conflicto"
  | "vuelta_en_curso"
  | "error_servidor"
  | "no_procesado";

export type ResultadoOperacion =
  | { clave: string; ok: true }
  | {
      clave: string;
      ok: false;
      codigo: CodigoError;
      mensaje: string;
      vueltaEnCursoId?: string;
    };

export function esReintentable(codigo: CodigoError): boolean {
  return codigo === "error_servidor" || codigo === "no_procesado";
}

/** Id del registro al que apunta una operación (para el espejo local). */
export function idDeOperacion(op: Operacion): string | null {
  if (op.tipo === "guardar") return typeof op.datos.id === "string" ? op.datos.id : null;
  return op.id;
}
