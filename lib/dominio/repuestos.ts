// Repuestos (CLAUDE.md, Módulo 5): historial por categoría y fecha, y "¿cuándo se
// cambió por última vez?". Puro: lo usan el celular (desde lo local) y el admin.

import { diaEnBogota, horaSospechosa, type FechaISO } from "./fechas";

/** Categorías iniciales (migración datos_iniciales). El admin puede agregar más. */
export const CATEGORIAS_INICIALES = [
  "Frenos",
  "Aceite",
  "Eléctrico",
  "Neumáticos",
  "Amortiguadores",
  "Refrigeración",
  "Dirección",
  "Motor",
  "General",
  "Otros",
] as const;

export type Categoria = { id: number; nombre: string; activa: boolean };

export type RepuestoBase = {
  id: string;
  categoria_id: number;
  nombre: string;
  ocurrido_en: string;
  /** Solo si ya llegó al servidor. */
  sincronizado_en?: string | null;
};

export type FiltroRepuestos = {
  categoriaId?: number | null;
  /** Días de Bogotá, inclusive. */
  desde?: FechaISO | null;
  hasta?: FechaISO | null;
  texto?: string | null;
};

const normalizar = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

/** Más recientes primero, filtrados por categoría, rango de días (Bogotá) y texto. */
export function filtrarRepuestos<R extends RepuestoBase>(repuestos: readonly R[], f: FiltroRepuestos = {}): R[] {
  const texto = f.texto ? normalizar(f.texto) : "";
  return repuestos
    .filter((r) => {
      if (f.categoriaId != null && r.categoria_id !== f.categoriaId) return false;
      const dia = diaEnBogota(new Date(r.ocurrido_en));
      if (f.desde && dia < f.desde) return false;
      if (f.hasta && dia > f.hasta) return false;
      if (texto && !normalizar(r.nombre).includes(texto)) return false;
      return true;
    })
    .sort((a, b) => b.ocurrido_en.localeCompare(a.ocurrido_en));
}

/**
 * Último cambio de cada categoría ("¿cuándo se cambiaron las pastillas de freno
 * por última vez?"). Las categorías sin registros quedan con null.
 */
export function ultimoPorCategoria<R extends RepuestoBase>(
  categorias: readonly Categoria[],
  repuestos: readonly R[],
): { categoria: Categoria; ultimo: R | null }[] {
  return categorias.map((categoria) => ({
    categoria,
    ultimo: filtrarRepuestos(repuestos, { categoriaId: categoria.id })[0] ?? null,
  }));
}

/** Registrado sin señal con una hora rara del celular (futuro o muy atrasada): revisar. */
export function requiereRevision(r: Pick<RepuestoBase, "ocurrido_en" | "sincronizado_en">): boolean {
  if (!r.sincronizado_en) return false;
  return horaSospechosa(new Date(r.ocurrido_en), new Date(r.sincronizado_en));
}

/** Días desde el último cambio, según el día de Bogotá de hoy. */
export function diasDesde(ocurridoEn: string, hoy: FechaISO): number {
  const dia = diaEnBogota(new Date(ocurridoEn));
  return Math.round((Date.parse(`${hoy}T00:00:00Z`) - Date.parse(`${dia}T00:00:00Z`)) / 86_400_000);
}
