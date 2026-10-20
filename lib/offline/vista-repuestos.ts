// Historial de repuestos en el celular, desde lo guardado localmente. Puro.
// Todos ven el historial completo; cada conductor corrige o elimina solo los suyos.

import { requiereRevision } from "@/lib/dominio/repuestos";
import type { RegistroLocal } from "./db";

export type RepuestoLocal = {
  id: string;
  buseta_id: string;
  categoria_id: number;
  nombre: string;
  foto_path?: string | null;
  costo?: number | null;
  kilometraje?: number | null;
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
  return registros
    .filter((r) => r.tabla === "repuestos" && !r.anulado)
    .map((r) => r.datos as RepuestoLocal)
    .map((r) => ({
      ...r,
      propio: r.registrado_por === uid,
      sinEnviar: sinEnviar.has(r.id),
      revisar: requiereRevision(r),
    }))
    .sort((a, b) => b.ocurrido_en.localeCompare(a.ocurrido_en));
}
