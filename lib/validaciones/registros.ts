// Esquemas de los registros que crean los conductores. Se usan en el formulario
// (antes de guardar en IndexedDB) y en el servidor (al sincronizar). Reflejan los
// checks de la base: si cambia una migración, cambiar aquí también.

import { z } from "zod";
import { destinosDeEncomienda, terminalDeFacturacion } from "@/lib/dominio/polilla";
import { buscarTramo, destinosPosibles, terminalesConPlanilla } from "@/lib/dominio/ruta";

const terminal = z.enum(["florencia", "pitalito", "popayan", "cali"]);
const tramo = z.enum(["ida-1", "ida-2", "ida-3", "regreso-1", "regreso-2", "regreso-3"]);
const sentido = z.enum(["ida", "regreso"]);

const pesos = (max: number) =>
  z.number({ error: "Escribe un monto" }).int("Sin decimales").min(0, "No puede ser negativo").max(max);
const pesosPositivos = (max: number) => pesos(max).min(1, "Debe ser mayor que 0");
const textoOpcional = (max: number) => z.string().trim().max(max).nullish();

/** Ruta de una foto en el bucket evidencias: {uid}/{uuid}.{jpg|png|webp}. */
const rutaFoto = z
  .string()
  .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/, "Ruta de foto inválida")
  .nullish();

/** Campos comunes: UUID generado en el celular y hora del celular. */
const base = {
  id: z.uuid(),
  ocurrido_en: z.iso.datetime({ offset: true }),
};

const conductor = z.uuid().nullish();

/** Crear una vuelta (cualquier conductor; solo una en curso por buseta). */
export const esquemaVuelta = z
  .object({
    ...base,
    buseta_id: z.uuid(),
    tipo: z.enum(["completa", "varada"]),
    fecha_inicio: z.iso.date(),
    conductor_florencia_id: conductor,
    conductor_pitalito_id: conductor,
    salida_programada_id: z.uuid().nullish(),
    notas: textoOpcional(1000),
  })
  .refine((v) => v.conductor_florencia_id || v.conductor_pitalito_id, {
    path: ["conductor_florencia_id"],
    message: "La vuelta necesita al menos un conductor",
  })
  .refine((v) => !v.conductor_florencia_id || v.conductor_florencia_id !== v.conductor_pitalito_id, {
    path: ["conductor_pitalito_id"],
    message: "Los dos puestos no pueden ser la misma persona",
  });

/** Un trayecto (ida o regreso) dentro de la vuelta. terminal_fin solo si se varó. */
export const esquemaTrayecto = z.object({
  ...base,
  vuelta_id: z.uuid(),
  sentido,
  fecha: z.iso.date(),
  hora_salida: z.iso.time().nullish(),
  terminal_fin: terminal.nullish(),
});

/** Cambio de estado que hace un conductor: finalizar (o reabrir si se equivocó). */
export const esquemaEstadoVuelta = z.object({
  id: z.uuid(),
  estado: z.enum(["en_curso", "finalizada"]),
});

/** Unirse a la vuelta en curso (o reemplazar a un compañero) en un puesto. */
export const esquemaUnirseAVuelta = z.object({
  vuelta_id: z.uuid(),
  puesto: z.enum(["florencia", "pitalito"]),
});

export const esquemaPlanilla = z
  .object({
    ...base,
    trayecto_id: z.uuid(),
    sentido, // solo para validar la terminal; no se guarda
    terminal,
    emitida: z.boolean(),
    motivo_sin_planilla: textoOpcional(300),
    numero: textoOpcional(40),
    neto: pesos(20_000_000).nullish(),
    pasajeros: z.number().int().min(0).max(60).nullish(),
    foto_path: rutaFoto,
  })
  .superRefine((p, ctx) => {
    if (!terminalesConPlanilla(p.sentido).includes(p.terminal)) {
      ctx.addIssue({ code: "custom", path: ["terminal"], message: "Esa terminal no emite planilla en este trayecto" });
    }
    if (p.emitida && p.neto == null) {
      ctx.addIssue({ code: "custom", path: ["neto"], message: "Escribe el neto a pagar" });
    }
    if (!p.emitida && !p.motivo_sin_planilla) {
      ctx.addIssue({ code: "custom", path: ["motivo_sin_planilla"], message: "Di por qué no hubo planilla" });
    }
  });

/**
 * Pasajero de vía. Si pasa por una terminal sin bajarse, se factura (obligatorio)
 * en la primera que pasa y el conductor digita cuánto pagó en taquilla. Lo
 * facturado nunca supera lo cobrado: el tiquete se hace por lo que pagó.
 */
export const esquemaPolilla = z
  .object({
    ...base,
    trayecto_id: z.uuid(),
    sentido, // solo para validar el tramo; no se guarda
    tramo_id: tramo,
    destino: terminal,
    monto_cobrado: pesosPositivos(2_000_000),
    facturado: z.boolean(),
    terminal_facturacion: terminal.nullish(),
    monto_facturado: pesos(2_000_000),
    destino_sobrante: z.enum(["polilla", "conductor"]),
  })
  .superRefine((p, ctx) => {
    if (buscarTramo(p.tramo_id)?.sentido !== p.sentido) {
      ctx.addIssue({ code: "custom", path: ["tramo_id"], message: "Ese tramo no es de este trayecto" });
      return;
    }
    if (!destinosPosibles(p.tramo_id).includes(p.destino)) {
      ctx.addIssue({ code: "custom", path: ["destino"], message: "Destino inválido para ese tramo" });
      return;
    }
    const debeFacturar = terminalDeFacturacion(p.tramo_id, p.destino);
    if (debeFacturar) {
      if (!p.facturado || p.terminal_facturacion !== debeFacturar) {
        ctx.addIssue({ code: "custom", path: ["terminal_facturacion"], message: `Pasa por ${debeFacturar}: hay que facturarlo allí` });
      }
      if (p.monto_facturado < 1) {
        ctx.addIssue({ code: "custom", path: ["monto_facturado"], message: "Escribe cuánto se pagó en taquilla" });
      }
    } else if (p.facturado || p.terminal_facturacion || p.monto_facturado !== 0) {
      ctx.addIssue({ code: "custom", path: ["monto_facturado"], message: "Se baja antes de la terminal: no se factura" });
    }
    if (p.monto_facturado > p.monto_cobrado) {
      ctx.addIssue({ code: "custom", path: ["monto_facturado"], message: "Lo facturado no puede superar lo cobrado" });
    }
  });

/**
 * Encomienda: dinero suelto (no va en la planilla). El monto es el neto final que
 * recibe la vuelta; si la dejó un taquillero, ya descontó su porcentaje.
 */
export const esquemaEncomienda = z
  .object({
    ...base,
    trayecto_id: z.uuid(),
    sentido, // solo para validar el orden; no se guarda
    recibida_en_terminal: terminal.nullish(),
    recibida_en_tramo: tramo.nullish(),
    destino: terminal,
    descripcion: textoOpcional(200),
    monto: pesosPositivos(5_000_000),
  })
  .superRefine((e, ctx) => {
    if ((e.recibida_en_terminal == null) === (e.recibida_en_tramo == null)) {
      ctx.addIssue({ code: "custom", path: ["recibida_en_terminal"], message: "Indica si se recibió en terminal o en la vía" });
      return;
    }
    const lugar = e.recibida_en_terminal ? { terminal: e.recibida_en_terminal } : { tramo: e.recibida_en_tramo ?? "" };
    if (!destinosDeEncomienda(e.sentido, lugar).includes(e.destino)) {
      ctx.addIssue({ code: "custom", path: ["destino"], message: "El destino debe estar más adelante en la ruta" });
    }
  });

export const esquemaGastoVariable = z
  .object({
    ...base,
    vuelta_id: z.uuid(),
    trayecto_id: z.uuid().nullish(),
    tipo: z.enum(["acpm", "liga", "extra", "arreglo"]),
    descripcion: textoOpcional(200),
    monto: pesosPositivos(10_000_000),
    terminal: terminal.nullish(),
    galones: z.number().positive().max(9999).nullish(),
    lugar: textoOpcional(120),
    foto_path: rutaFoto,
  })
  .superRefine((g, ctx) => {
    if (g.tipo === "liga" && !g.terminal) {
      ctx.addIssue({ code: "custom", path: ["terminal"], message: "¿En qué terminal?" });
    }
    if ((g.tipo === "extra" || g.tipo === "arreglo") && !g.descripcion) {
      ctx.addIssue({ code: "custom", path: ["descripcion"], message: "Describe el gasto" });
    }
  });

export const esquemaRepuesto = z.object({
  ...base,
  buseta_id: z.uuid(),
  categoria_id: z.number().int().positive(),
  nombre: z.string().trim().min(1, "Escribe el repuesto").max(120),
  foto_path: rutaFoto,
  costo: pesos(50_000_000).nullish(),
  kilometraje: z.number().int().min(0).max(5_000_000).nullish(),
  taller: textoOpcional(120),
  notas: textoOpcional(1000),
  vuelta_id: z.uuid().nullish(),
});

/**
 * Anular un registro (no hay borrado físico). En la interfaz se llama "Eliminar"
 * y pide confirmación; el registro queda anulado con su motivo.
 */
export const esquemaAnulacion = z.object({
  id: z.uuid(),
  motivo_anulacion: z.string().trim().min(1, "Di por qué se anula").max(300),
});

export type Vuelta = z.infer<typeof esquemaVuelta>;
export type Trayecto = z.infer<typeof esquemaTrayecto>;
export type Planilla = z.infer<typeof esquemaPlanilla>;
export type PasajeroPolilla = z.infer<typeof esquemaPolilla>;
export type Encomienda = z.infer<typeof esquemaEncomienda>;
export type GastoVariable = z.infer<typeof esquemaGastoVariable>;
export type Repuesto = z.infer<typeof esquemaRepuesto>;
