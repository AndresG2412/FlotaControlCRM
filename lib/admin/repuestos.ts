import "server-only";
import { exigirRol } from "@/lib/auth/sesion";
import { rangoDelMes } from "@/lib/dominio/fechas";
import { requiereRevision, type Categoria } from "@/lib/dominio/repuestos";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { FiltrosRepuestos } from "@/lib/validaciones/admin";
import { nombreDe, nombres, urlsDeFotos } from "./comun";

// Lectura de repuestos para el panel del admin (historial por categoría y fecha).
// Cada función exportada verifica el rol (AUTZ-6).

const MAX_REPUESTOS_LISTA = 500;

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

/** Historial de repuestos por fecha del cambio, más recientes primero. */
export async function listarRepuestos(filtros: FiltrosRepuestos = {}): Promise<RepuestoAdmin[]> {
  await exigirRol("admin");
  const supabase = await crearClienteServidor();

  let consulta = supabase
    .from("repuestos")
    .select(
      `id, buseta_id, categoria_id, nombre, fecha_cambio, costo, taller, notas, vuelta_id, foto_path,
       estado, motivo_anulacion, ocurrido_en, sincronizado_en, registrado_por, actualizado_por, actualizado_en,
       repuesto_categorias ( nombre )`,
    )
    .order("fecha_cambio", { ascending: false })
    .order("ocurrido_en", { ascending: false })
    .limit(MAX_REPUESTOS_LISTA);

  if (filtros.categoria) consulta = consulta.eq("categoria_id", filtros.categoria);
  if (!filtros.anulados) consulta = consulta.eq("estado", "activo");
  if (filtros.mes) {
    // fecha_cambio ya es un día de Bogotá (date): el mes se filtra directo.
    const { desde, hasta } = rangoDelMes(filtros.mes);
    consulta = consulta.gte("fecha_cambio", desde).lte("fecha_cambio", hasta);
  }
  if (filtros.texto) consulta = consulta.ilike("nombre", `%${filtros.texto.replace(/[%_\\]/g, "\\$&")}%`);

  const [{ data, error }, mapa] = await Promise.all([consulta, nombres(supabase)]);
  if (error) throw new Error("No se pudieron leer los repuestos");

  const fotos = await urlsDeFotos(supabase, data.flatMap((r) => (r.foto_path ? [r.foto_path] : [])));

  return data.map((r) => ({
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
}

/** Buseta activa (hoy hay una) para registrar repuestos desde el panel. */
export async function busetaPrincipal(): Promise<{ id: string; placa: string } | null> {
  await exigirRol("admin");
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("busetas").select("id, placa").eq("activa", true).order("creado_en").limit(1).maybeSingle();
  return data;
}
