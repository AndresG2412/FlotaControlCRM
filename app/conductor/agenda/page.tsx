import { exigirRol } from "@/lib/auth/sesion";
import { PantallaAgenda } from "./pantalla-agenda";

export const metadata = { title: "Agenda" };

// Programación y vencimientos, solo lectura y sin señal (lo descargado).
export default async function Agenda() {
  await exigirRol("conductor");
  return <PantallaAgenda />;
}
