"use client";

import { Bus, CalendarDays, Wrench } from "lucide-react";
import { PestanasInferiores, type Seccion } from "../pestanas";

const SECCIONES: readonly Seccion[] = [
  { href: "/conductor", titulo: "Mi vuelta", icono: Bus },
  { href: "/conductor/repuestos", titulo: "Repuestos", icono: Wrench },
  { href: "/conductor/agenda", titulo: "Agenda", icono: CalendarDays },
];

// El conductor usa la app en el celular: la barra queda abajo también en pantallas grandes.
export function NavegacionConductor() {
  return <PestanasInferiores secciones={SECCIONES} raiz="/conductor" escritorio />;
}
