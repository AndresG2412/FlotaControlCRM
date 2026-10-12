import type { EstadoVuelta, TipoVuelta } from "@/lib/dominio/vuelta";

export const ETIQUETA_ESTADO: Record<EstadoVuelta, string> = {
  en_curso: "En curso",
  finalizada: "Finalizada",
  cerrada: "Cerrada",
};

export const ETIQUETA_TIPO: Record<TipoVuelta, string> = {
  completa: "Completa",
  varada: "Varada",
};

const formatoFecha = new Intl.DateTimeFormat("es-CO", {
  timeZone: "UTC", // la fecha ya es un día calendario de Bogotá
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** "YYYY-MM-DD" (día calendario) para mostrar. */
export function fechaCorta(fecha: string): string {
  return formatoFecha.format(new Date(`${fecha}T00:00:00Z`));
}
