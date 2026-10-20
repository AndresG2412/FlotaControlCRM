import { exigirRol } from "@/lib/auth/sesion";
import { PantallaRepuestos } from "./pantalla-repuestos";

export const metadata = { title: "Repuestos" };

// El historial y el formulario funcionan sin señal (lo local); el servidor solo
// aporta el usuario. Cada página verifica el rol, no solo el layout.
export default async function Repuestos() {
  const perfil = await exigirRol("conductor");
  return <PantallaRepuestos uid={perfil.id} />;
}
