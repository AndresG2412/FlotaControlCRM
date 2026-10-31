// Paginación de listas largas (historial de repuestos). Puro: lo usan el panel
// (rango para la consulta) y el celular (rebanada de lo local).

export const POR_PAGINA = 20;

export type Pagina = {
  /** Página actual (desde 1), ya acotada a las que existen. */
  pagina: number;
  paginas: number;
  /** Índices inclusivos de la página (como .range() de Supabase). */
  desde: number;
  hasta: number;
};

export function paginar(total: number, pedida: number, porPagina: number = POR_PAGINA): Pagina {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const pagina = Number.isFinite(pedida) ? Math.min(Math.max(1, Math.trunc(pedida)), paginas) : 1;
  const desde = (pagina - 1) * porPagina;
  return { pagina, paginas, desde, hasta: desde + porPagina - 1 };
}
