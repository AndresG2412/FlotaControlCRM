// Esquemas de lo que envía el panel del admin (filtros y Server Actions).
// Reutilizan los campos de registros.ts para que las reglas sean las mismas que
// las del conductor y las de la base.

import { z } from "zod";
import { esquemaPlanilla } from "./registros";

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
