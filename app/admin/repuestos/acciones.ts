"use server";

import { revalidatePath } from "next/cache";
import { exigirRol } from "@/lib/auth/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import {
  esquemaCategoria,
  esquemaEstadoCategoria,
  esquemaRepuestoAdmin,
  type RepuestoAdminEntrada,
} from "@/lib/validaciones/admin";
import { esquemaAnulacion } from "@/lib/validaciones/registros";

// Acciones del admin sobre repuestos y sus categorías. Cada una verifica el rol,
// valida con Zod y escribe con la sesión del admin (la RLS es la última barrera).

export type Resultado = { error: string | null };

const primerMensaje = (issues: { message: string }[]) => issues[0]?.message ?? "Datos inválidos";

function revalidar() {
  revalidatePath("/admin/repuestos");
  revalidatePath("/admin/configuracion/categorias");
}

/** Registra un repuesto nuevo o corrige uno existente. Quién lo hizo lo pone la base. */
export async function guardarRepuestoAdmin(entrada: RepuestoAdminEntrada): Promise<Resultado> {
  const perfil = await exigirRol("admin");
  const datos = esquemaRepuestoAdmin.safeParse(entrada);
  if (!datos.success) return { error: primerMensaje(datos.error.issues) };
  const { id, ...campos } = datos.data;
  const supabase = await crearClienteServidor();

  if (id) {
    const { data, error } = await supabase
      .from("repuestos")
      .update({
        categoria_id: campos.categoria_id,
        nombre: campos.nombre,
        costo: campos.costo ?? null,
        kilometraje: campos.kilometraje ?? null,
        taller: campos.taller ?? null,
        notas: campos.notas ?? null,
      })
      .eq("id", id)
      .eq("estado", "activo")
      .select("id");
    if (error || !data.length) return { error: "No se pudo guardar la corrección" };
  } else {
    const { error } = await supabase.from("repuestos").insert({
      ...campos,
      id: crypto.randomUUID(),
      ocurrido_en: new Date().toISOString(),
      registrado_por: perfil.id,
    });
    if (error) return { error: "No se pudo registrar el repuesto" };
  }
  revalidar();
  return { error: null };
}

/** "Eliminar" un repuesto: queda anulado con su motivo (no hay borrado físico). */
export async function anularRepuesto(entrada: { id: string; motivo_anulacion: string }): Promise<Resultado> {
  await exigirRol("admin");
  const datos = esquemaAnulacion.strict().safeParse(entrada);
  if (!datos.success) return { error: primerMensaje(datos.error.issues) };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("repuestos")
    .update({ estado: "anulado", motivo_anulacion: datos.data.motivo_anulacion })
    .eq("id", datos.data.id)
    .eq("estado", "activo")
    .select("id");
  if (error || !data.length) return { error: "No se pudo eliminar el repuesto" };
  revalidar();
  return { error: null };
}

export async function crearCategoria(entrada: { nombre: string }): Promise<Resultado> {
  await exigirRol("admin");
  const datos = esquemaCategoria.safeParse(entrada);
  if (!datos.success) return { error: primerMensaje(datos.error.issues) };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("repuesto_categorias").insert({ nombre: datos.data.nombre });
  if (error?.code === "23505") return { error: "Ya existe una categoría con ese nombre" };
  if (error) return { error: "No se pudo crear la categoría" };
  revalidar();
  return { error: null };
}

/** Desactivar oculta la categoría al registrar; el historial la conserva. */
export async function cambiarEstadoCategoria(entrada: { id: number; activa: boolean }): Promise<Resultado> {
  await exigirRol("admin");
  const datos = esquemaEstadoCategoria.safeParse(entrada);
  if (!datos.success) return { error: "Datos inválidos" };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("repuesto_categorias")
    .update({ activa: datos.data.activa })
    .eq("id", datos.data.id)
    .select("id");
  if (error || !data.length) return { error: "No se pudo actualizar la categoría" };
  revalidar();
  return { error: null };
}
