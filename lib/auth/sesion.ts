import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Rol } from "@/lib/dominio/roles";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type { Rol };

export type Perfil = {
  id: string;
  nombre: string;
  rol: Rol;
};

/** Página de inicio de cada rol. */
export const INICIO_POR_ROL: Record<Rol, string> = {
  admin: "/admin",
  conductor: "/conductor",
};

/**
 * Perfil del usuario actual, o null si no hay sesión válida, el perfil no existe
 * o está inactivo. Se memoriza por petición.
 */
export const obtenerPerfil = cache(async (): Promise<Perfil | null> => {
  const supabase = await crearClienteServidor();
  const { data: auth } = await supabase.auth.getClaims();
  const uid = auth?.claims?.sub;
  if (!uid) return null;

  const { data } = await supabase
    .from("perfiles")
    .select("id, nombre, rol, activo")
    .eq("id", uid)
    .maybeSingle();

  if (!data || !data.activo || (data.rol !== "admin" && data.rol !== "conductor")) return null;
  return { id: data.id, nombre: data.nombre, rol: data.rol };
});

/**
 * Exige un rol en un layout o página. Si no hay sesión manda a /login; si el rol
 * no corresponde, manda a la página de su propio rol.
 * La protección real de los datos es la RLS; esto solo organiza la navegación.
 */
export async function exigirRol(rol: Rol): Promise<Perfil> {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect("/login");
  if (perfil.rol !== rol) redirect(INICIO_POR_ROL[perfil.rol]);
  return perfil;
}
