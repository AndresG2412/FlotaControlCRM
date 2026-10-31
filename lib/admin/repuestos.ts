import "server-only";
import { exigirRol } from "@/lib/auth/sesion";
import { rangoDelMes } from "@/lib/dominio/fechas";
import { paginar } from "@/lib/dominio/paginacion";
import { requiereRevision, type Categoria, type RepuestoBase } from "@/lib/dominio/repuestos";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { FiltrosRepuestos } from "@/lib/validaciones/admin";
import { nombreDe, nombres, urlsDeFotos } from "./comun";

// Lectura de repuestos para el panel del admin (historial por categoría y fecha).
// Cada función exportada verifica el rol (AUTZ-6). El historial se trae por
// páginas: solo se leen las filas (y se firman las fotos) de la página pedida.

export type RepuestoAdmin = {
  id: string;
  buseta_id: string;
  categoria_id: number;
  categoria: string;
  nombre: string;
  fecha_cambio: string;
  costo: number | null;
  taller: string | null;
  notas: string | null;
  vuelta_id: string | null;
  foto_path: string | null;
  fotoUrl: string | null;
  estado: "activo" | "anulado";
  motivo_anulacion: string | null;
  ocurrido_en: string;
  sincronizado_en: string;
  registradoPor: string;
  actualizadoPor: string | null;
  actualizado_en: string | null;
  revisar: boolean;
};

export async function listarCategorias(): Promise<Categoria[]> {
  await exigirRol("admin");
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("repuesto_categorias").select("id, nombre, activa").order("id");
  if (error) throw new Error("No se pudieron leer las categorías");
  return data;
}

export type PaginaRepuestos = {
  repuestos: RepuestoAdmin[];
  total: number;
  pagina: number;
  paginas: number;
};

/** Una página del historial de repuestos por fecha del cambio, más recientes primero. */
export async function listarRepuestos(filtros: FiltrosRepuestos = {}): Promise<PaginaRepuestos> {
  await exigirRol("admin");
  const supabase = await crearClienteServidor();

  // Se pide la página con el total exacto; si la página no existe (filtro nuevo
  // o URL vieja), se vuelve a pedir la última que sí existe.
  const leer = (desde: number, hasta: number) => {
    let consulta = supabase
      .from("repuestos")
      .select(
        `id, buseta_id, categoria_id, nombre, fecha_cambio, costo, taller, notas, vuelta_id, foto_path,
         estado, motivo_anulacion, ocurrido_en, sincronizado_en, registrado_por, actualizado_por, actualizado_en,
         repuesto_categorias ( nombre )`,
        { count: "exact" },
      )
      .order("fecha_cambio", { ascending: false })
      .order("ocurrido_en", { ascending: false })
      .order("id")
      .range(desde, hasta);

    if (filtros.categoria) consulta = consulta.eq("categoria_id", filtros.categoria);
    if (!filtros.anulados) consulta = consulta.eq("estado", "activo");
    if (filtros.mes) {
      // fecha_cambio ya es un día de Bogotá (date): el mes se filtra directo.
      const mes = rangoDelMes(filtros.mes);
      consulta = consulta.gte("fecha_cambio", mes.desde).lte("fecha_cambio", mes.hasta);
    }
    if (filtros.texto) consulta = consulta.ilike("nombre", `%${filtros.texto.replace(/[%_\\]/g, "\\$&")}%`);
    return consulta;
  };

  const pedida = paginar(Number.MAX_SAFE_INTEGER, filtros.pagina ?? 1);
  const [primera, mapa] = await Promise.all([leer(pedida.desde, pedida.hasta), nombres(supabase)]);
  let respuesta = primera;
  if (respuesta.error) throw new Error("No se pudieron leer los repuestos");
  let pagina = paginar(respuesta.count ?? 0, pedida.pagina);
  if (pagina.pagina !== pedida.pagina) {
    respuesta = await leer(pagina.desde, pagina.hasta);
    pagina = paginar(respuesta.count ?? 0, pagina.pagina);
  }
  const { data, error, count } = respuesta;
  if (error || !data) throw new Error("No se pudieron leer los repuestos");

  const fotos = await urlsDeFotos(supabase, data.flatMap((r) => (r.foto_path ? [r.foto_path] : [])));

  const repuestos = data.map((r): RepuestoAdmin => ({
    id: r.id,
    buseta_id: r.buseta_id,
    categoria_id: r.categoria_id,
    categoria: r.repuesto_categorias?.nombre ?? "Sin categoría",
    nombre: r.nombre,
    fecha_cambio: r.fecha_cambio,
    costo: r.costo,
    taller: r.taller,
    notas: r.notas,
    vuelta_id: r.vuelta_id,
    foto_path: r.foto_path,
    fotoUrl: r.foto_path ? (fotos.get(r.foto_path) ?? null) : null,
    estado: r.estado === "anulado" ? "anulado" : "activo",
    motivo_anulacion: r.motivo_anulacion,
    ocurrido_en: r.ocurrido_en,
    sincronizado_en: r.sincronizado_en,
    registradoPor: nombreDe(mapa, r.registrado_por) ?? "Usuario desconocido",
    actualizadoPor: nombreDe(mapa, r.actualizado_por),
    actualizado_en: r.actualizado_en,
    revisar: requiereRevision(r),
  }));
  return { repuestos, total: count ?? 0, pagina: pagina.pagina, paginas: pagina.paginas };
}

/**
 * Lo mínimo para "último cambio por categoría": sin fotos ni nombres, para que
 * no pese aunque el historial sea largo.
 */
export async function ultimosCambios(): Promise<RepuestoBase[]> {
  await exigirRol("admin");
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("repuestos")
    .select("id, categoria_id, nombre, fecha_cambio, ocurrido_en")
    .eq("estado", "activo")
    .order("fecha_cambio", { ascending: false })
    .order("ocurrido_en", { ascending: false });
  if (error) throw new Error("No se pudieron leer los repuestos");
  return data;
}

/** Buseta activa (hoy hay una) para registrar repuestos desde el panel. */
export async function busetaPrincipal(): Promise<{ id: string; placa: string } | null> {
  await exigirRol("admin");
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("busetas").select("id, placa").eq("activa", true).order("creado_en").limit(1).maybeSingle();
  return data;
}
