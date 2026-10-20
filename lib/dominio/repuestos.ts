// Repuestos (CLAUDE.md, Módulo 5): historial por categoría y fecha, y "¿cuándo se
// cambió por última vez?". Puro: lo usan el celular (desde lo local) y el admin.

import { diasEntre, horaSospechosa, type FechaISO } from "./fechas";

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
  /** Día (Bogotá) en que se cambió la pieza; lo elige quien registra. */
  fecha_cambio: FechaISO;
  /** Hora del celular cuando se registró (para detectar horas raras). */
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

/** Por fecha del cambio, más recientes primero (y por hora de registro si es el mismo día). */
const masReciente = (a: RepuestoBase, b: RepuestoBase) =>
  b.fecha_cambio.localeCompare(a.fecha_cambio) || b.ocurrido_en.localeCompare(a.ocurrido_en);

/** Más recientes primero, filtrados por categoría, rango de días (fecha del cambio) y texto. */
export function filtrarRepuestos<R extends RepuestoBase>(repuestos: readonly R[], f: FiltroRepuestos = {}): R[] {
  const texto = f.texto ? normalizar(f.texto) : "";
  return repuestos
    .filter((r) => {
      if (f.categoriaId != null && r.categoria_id !== f.categoriaId) return false;
      if (f.desde && r.fecha_cambio < f.desde) return false;
      if (f.hasta && r.fecha_cambio > f.hasta) return false;
      if (texto && !normalizar(r.nombre).includes(texto)) return false;
      return true;
    })
    .sort(masReciente);
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

/** Días desde una fecha (día de Bogotá) hasta hoy. */
export function diasDesde(fecha: FechaISO, hoy: FechaISO): number {
  return diasEntre(fecha, hoy);
}
