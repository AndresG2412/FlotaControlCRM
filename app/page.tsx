import { redirect } from "next/navigation";
import { INICIO_POR_ROL, obtenerPerfil } from "@/lib/auth/sesion";

// La raíz solo reparte: cada rol tiene su propia área.
export default async function Inicio() {
  const perfil = await obtenerPerfil();
  redirect(perfil ? INICIO_POR_ROL[perfil.rol] : "/login");
}
