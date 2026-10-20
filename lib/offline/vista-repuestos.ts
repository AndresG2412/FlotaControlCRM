// Historial de repuestos en el celular, desde lo guardado localmente. Puro.
// Todos ven el historial completo; cada conductor corrige o elimina solo los suyos.

import { diaEnBogota } from "@/lib/dominio/fechas";
import { filtrarRepuestos, requiereRevision } from "@/lib/dominio/repuestos";
import type { RegistroLocal } from "./db";

export type RepuestoLocal = {
  id: string;
  buseta_id: string;
  categoria_id: number;
  nombre: string;
  /** Día del cambio (Bogotá). */
  fecha_cambio: string;
  foto_path?: string | null;
  costo?: number | null;
  taller?: string | null;
  notas?: string | null;
  vuelta_id?: string | null;
  ocurrido_en: string;
  sincronizado_en?: string | null;
  registrado_por?: string | null;
};

export type RepuestoVista = RepuestoLocal & {
  /** Lo registró el usuario actual: puede corregirlo o eliminarlo. */
  propio: boolean;
  sinEnviar: boolean;
  /** Hora del celular rara al registrarlo sin señal. */
  revisar: boolean;
};

export function armarRepuestos(
  registros: readonly RegistroLocal[],
  uid: string,
  sinEnviar: ReadonlySet<string> = new Set(),
): RepuestoVista[] {
  const lista = registros
    .filter((r) => r.tabla === "repuestos" && !r.anulado)
    .map((r) => r.datos as RepuestoLocal)
    .map((r) => ({
      ...r,
      // Registros guardados antes de existir la fecha del cambio: el día en que se registraron.
      fecha_cambio: r.fecha_cambio ?? diaEnBogota(new Date(r.ocurrido_en)),
      propio: r.registrado_por === uid,
      sinEnviar: sinEnviar.has(r.id),
      revisar: requiereRevision(r),
    }));
  return filtrarRepuestos(lista);
}
