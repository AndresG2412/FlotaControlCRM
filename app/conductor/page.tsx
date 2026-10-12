import { exigirRol } from "@/lib/auth/sesion";
import { PantallaVuelta } from "./pantalla-vuelta";

// La pantalla lee y escribe en el celular (funciona sin señal); el servidor solo
// aporta el usuario. Cada página verifica el rol, no solo el layout.
export default async function VueltaActual() {
  const perfil = await exigirRol("conductor");
  return <PantallaVuelta uid={perfil.id} />;
}
