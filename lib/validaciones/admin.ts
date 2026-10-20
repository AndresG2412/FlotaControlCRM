// Esquemas de lo que envía el panel del admin (filtros y Server Actions).
// Reutilizan los campos de registros.ts para que las reglas sean las mismas que
// las del conductor y las de la base.

import { z } from "zod";
import { esquemaPlanilla, esquemaRepuesto } from "./registros";

const mes = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mes inválido");
const estadoVuelta = z.enum(["en_curso", "finalizada", "cerrada"]);
const tipoVuelta = z.enum(["completa", "varada"]);

/** Filtros de la lista de vueltas (searchParams). Un valor inválido se ignora. */
export const esquemaFiltrosVueltas = z.object({
  mes: mes.optional().catch(undefined),
  estado: estadoVuelta.optional().catch(undefined),
  tipo: tipoVuelta.optional().catch(undefined),
});

export type FiltrosVueltas = z.infer<typeof esquemaFiltrosVueltas>;

const campos = esquemaPlanilla.shape;

/**
 * Corrección de una planilla por el admin: solo los campos que se digitan. El
 * servidor completa el resto con lo guardado y valida todo con esquemaPlanilla.
 */
export const esquemaCorreccionPlanilla = z
  .object({
    id: campos.id,
    emitida: campos.emitida,
    neto: campos.neto,
    numero: campos.numero,
    pasajeros: campos.pasajeros,
    motivo_sin_planilla: campos.motivo_sin_planilla,
  })
  .strict();

/** Conductores y tipo de la vuelta. */
export const esquemaDatosVuelta = z
  .object({
    id: z.uuid(),
    tipo: tipoVuelta,
    conductor_florencia_id: z.uuid().nullable(),
    conductor_pitalito_id: z.uuid().nullable(),
  })
  .strict()
  .refine((v) => v.conductor_florencia_id || v.conductor_pitalito_id, {
    path: ["conductor_florencia_id"],
    message: "La vuelta necesita al menos un conductor",
  })
  .refine((v) => !v.conductor_florencia_id || v.conductor_florencia_id !== v.conductor_pitalito_id, {
    path: ["conductor_pitalito_id"],
    message: "Los dos puestos no pueden ser la misma persona",
  });

export const esquemaIdVuelta = z.object({ id: z.uuid() }).strict();

export type CorreccionPlanilla = z.infer<typeof esquemaCorreccionPlanilla>;
export type DatosVuelta = z.infer<typeof esquemaDatosVuelta>;

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida").refine((f) => !Number.isNaN(Date.parse(`${f}T00:00:00Z`)), "Fecha inválida");

/** Una fila de la configuración de gastos fijos (valor 0 = quitar el concepto desde esa fecha). */
export const esquemaGastoFijoConfig = z
  .object({
    concepto: z.string().trim().min(1, "Escribe el concepto").max(80, "Máximo 80 caracteres"),
    valor: z.number().int("Sin decimales").min(0, "No puede ser negativo").max(10_000_000, "Máximo $10.000.000"),
    se_paga_en_ruta: z.boolean(),
    vigente_desde: fecha,
  })
  .strict();

/** Ajuste del valor de un gasto fijo en una vuelta concreta. */
export const esquemaAjusteGastoFijo = z
  .object({
    id: z.uuid(),
    valor: z.number().int("Sin decimales").min(0, "No puede ser negativo").max(10_000_000, "Máximo $10.000.000"),
  })
  .strict();

/** Cierre de la vuelta: efectivo que entregó el conductor (lo digita el admin). */
export const esquemaCierreVuelta = z
  .object({
    id: z.uuid(),
    efectivo_entregado: z
      .number()
      .int("Sin decimales")
      .min(0, "No puede ser negativo")
      .max(50_000_000, "Máximo $50.000.000"),
    notas: z.string().trim().max(1000, "Máximo 1.000 caracteres").optional(),
  })
  .strict();

export const esquemaReabrirCerrada = z
  .object({
    id: z.uuid(),
    motivo: z.string().trim().min(3, "Di por qué se reabre").max(300, "Máximo 300 caracteres"),
  })
  .strict();

export type GastoFijoConfigEntrada = z.infer<typeof esquemaGastoFijoConfig>;
export type AjusteGastoFijo = z.infer<typeof esquemaAjusteGastoFijo>;
export type CierreVuelta = z.infer<typeof esquemaCierreVuelta>;
export type ReabrirCerrada = z.infer<typeof esquemaReabrirCerrada>;

/** Filtros del historial de repuestos (searchParams). Un valor inválido se ignora. */
export const esquemaFiltrosRepuestos = z.object({
  categoria: z.coerce.number().int().positive().optional().catch(undefined),
  mes: mes.optional().catch(undefined),
  texto: z.string().trim().max(60).optional().catch(undefined),
  anulados: z
    .enum(["1"])
    .optional()
    .catch(undefined)
    .transform((v) => v === "1"),
});
export type FiltrosRepuestos = Partial<z.infer<typeof esquemaFiltrosRepuestos>>;

/**
 * Repuesto registrado o corregido desde el panel. El id y ocurrido_en los pone
 * el servidor al crear; al corregir se conservan los guardados.
 */
export const esquemaRepuestoAdmin = esquemaRepuesto
  .omit({ id: true, ocurrido_en: true })
  .extend({ id: z.uuid().optional() })
  .strict();
export type RepuestoAdminEntrada = z.infer<typeof esquemaRepuestoAdmin>;

/** Categoría de repuestos (el admin agrega o desactiva; no se borran). */
export const esquemaCategoria = z
  .object({ nombre: z.string().trim().min(1, "Escribe el nombre").max(60) })
  .strict();
export const esquemaEstadoCategoria = z.object({ id: z.number().int().positive(), activa: z.boolean() }).strict();
