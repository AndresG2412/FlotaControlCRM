"use client";

import { Bus, CalendarDays, ChartColumn, LayoutGrid, Receipt, Settings, Wrench } from "lucide-react";
import { PestanasInferiores, PestanasSuperiores, type Seccion } from "../pestanas";

const SECCIONES: readonly Seccion[] = [
  { href: "/admin", titulo: "Inicio", icono: LayoutGrid },
  { href: "/admin/vueltas", titulo: "Vueltas", icono: Bus },
  { href: "/admin/programacion", titulo: "Salidas", icono: CalendarDays, deshabilitada: true },
  { href: "/admin/repuestos", titulo: "Repuestos", icono: Wrench },
  { href: "/admin/pagos", titulo: "Pagos", icono: Receipt },
  { href: "/admin/reportes", titulo: "Reportes", icono: ChartColumn, deshabilitada: true },
  // Salidas, Reportes y Configuración están en pausa por decisión del dueño (se ven, pero no abren).
  { href: "/admin/configuracion", titulo: "Configuración", icono: Settings, soloEscritorio: true, deshabilitada: true },
];

export function NavegacionAdminSuperior() {
  return <PestanasSuperiores secciones={SECCIONES} raiz="/admin" />;
}

export function NavegacionAdminInferior() {
  return <PestanasInferiores secciones={SECCIONES} raiz="/admin" />;
}
