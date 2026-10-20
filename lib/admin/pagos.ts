import "server-only";
import { exigirRol } from "@/lib/auth/sesion";
import type { PagoBase } from "@/lib/dominio/vencimientos";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { nombreDe, nombres, urlsDeFotos } from "./comun";

// Pagos y vencimientos (solo admin). Cada función exportada verifica el rol.

export type PagoAdmin = PagoBase & {
  notas: string | null;
  comprobanteUrl: string | null;
  estado: "activo" | "anulado";
  motivo_anulacion: string | null;
  creadoPor: string | null;
};

const MAX_PAGOS = 500;

export async function listarPagos(): Promise<PagoAdmin[]> {
  await exigirRol("admin");
  const supabase = await crearClienteServidor();
  const [{ data, error }, mapa] = await Promise.all([
    supabase
      .from("pagos_periodicos")
      .select(
        "id, nombre, fecha_pago, costo, fecha_recordatorio, fecha_vencimiento, recordatorio_enviado_en, notas, comprobante_path, estado, motivo_anulacion, creado_en, creado_por",
      )
      .order("fecha_pago", { ascending: false })
      .limit(MAX_PAGOS),
    nombres(supabase),
  ]);
  if (error) throw new Error("No se pudieron leer los pagos");

  const fotos = await urlsDeFotos(supabase, data.flatMap((p) => (p.comprobante_path ? [p.comprobante_path] : [])));
  return data.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    fecha_pago: p.fecha_pago,
    costo: p.costo,
    fecha_recordatorio: p.fecha_recordatorio,
    fecha_vencimiento: p.fecha_vencimiento,
    recordatorio_enviado_en: p.recordatorio_enviado_en,
    creado_en: p.creado_en,
    notas: p.notas,
    comprobanteUrl: p.comprobante_path ? (fotos.get(p.comprobante_path) ?? null) : null,
    estado: p.estado === "anulado" ? "anulado" : "activo",
    motivo_anulacion: p.motivo_anulacion,
    creadoPor: nombreDe(mapa, p.creado_por),
  }));
}
