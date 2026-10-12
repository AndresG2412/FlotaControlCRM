"use server";

import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { esquemaLogin, correoDeUsuario } from "@/lib/validaciones/auth";
import { INICIO_POR_ROL, obtenerPerfil } from "./sesion";

export type EstadoLogin = { error: string | null; usuario: string };

export async function iniciarSesion(_previo: EstadoLogin, datos: FormData): Promise<EstadoLogin> {
  const usuario = String(datos.get("usuario") ?? "");
  const entrada = esquemaLogin.safeParse({
    usuario: datos.get("usuario"),
    contrasena: datos.get("contrasena"),
  });
  if (!entrada.success) {
    return { error: entrada.error.issues[0]?.message ?? "Datos inválidos", usuario };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: correoDeUsuario(entrada.data.usuario),
    password: entrada.data.contrasena,
  });
  // Mismo mensaje para usuario inexistente y contraseña errada.
  if (error) return { error: "Usuario o contraseña incorrectos", usuario };

  const perfil = await obtenerPerfil();
  if (!perfil) {
    await supabase.auth.signOut();
    return { error: "Tu cuenta no está activa. Habla con el administrador.", usuario };
  }

  redirect(INICIO_POR_ROL[perfil.rol]);
}

export async function cerrarSesion() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
