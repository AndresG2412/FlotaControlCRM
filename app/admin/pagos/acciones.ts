"use server";

import { revalidatePath } from "next/cache";
import { exigirRol } from "@/lib/auth/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { esquemaPago, type PagoEntrada } from "@/lib/validaciones/admin";
import { esquemaAnulacion } from "@/lib/validaciones/registros";

// Pagos y vencimientos (solo admin). Renovar = registrar un pago nuevo; el
// historial no se toca. Eliminar = anular con motivo.

export type Resultado = { error: string | null };

const primerMensaje = (issues: { message: string }[]) => issues[0]?.message ?? "Datos inválidos";

function revalidar() {
  revalidatePath("/admin/pagos");
  revalidatePath("/admin");
}

export async function registrarPago(entrada: PagoEntrada): Promise<Resultado> {
  const perfil = await exigirRol("admin");
  const datos = esquemaPago.safeParse(entrada);
  if (!datos.success) return { error: primerMensaje(datos.error.issues) };
  // La foto del comprobante solo puede estar en la carpeta del propio admin.
  if (datos.data.comprobante_path && !datos.data.comprobante_path.startsWith(`${perfil.id}/`)) {
    return { error: "Foto del comprobante inválida" };
  }

  const supabase = await crearClienteServidor();
  const { data: buseta } = await supabase
    .from("busetas")
    .select("id")
    .eq("activa", true)
    .order("creado_en")
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("pagos_periodicos").insert({
    buseta_id: buseta?.id ?? null,
    nombre: datos.data.nombre,
    fecha_pago: datos.data.fecha_pago,
    costo: datos.data.costo,
    fecha_recordatorio: datos.data.fecha_recordatorio ?? null,
    fecha_vencimiento: datos.data.fecha_vencimiento ?? null,
    notas: datos.data.notas || null,
    comprobante_path: datos.data.comprobante_path ?? null,
  });
  if (error) return { error: "No se pudo registrar el pago" };
  revalidar();
  return { error: null };
}

export async function anularPago(entrada: { id: string; motivo_anulacion: string }): Promise<Resultado> {
  await exigirRol("admin");
  const datos = esquemaAnulacion.strict().safeParse(entrada);
  if (!datos.success) return { error: primerMensaje(datos.error.issues) };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("pagos_periodicos")
    .update({ estado: "anulado", motivo_anulacion: datos.data.motivo_anulacion })
    .eq("id", datos.data.id)
    .eq("estado", "activo")
    .select("id");
  if (error || !data.length) return { error: "No se pudo eliminar el pago" };
  revalidar();
  return { error: null };
}
