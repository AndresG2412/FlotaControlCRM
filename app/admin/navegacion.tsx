"use client";

import { Bus, CalendarDays, ChartColumn, LayoutGrid, Receipt, Settings, Wrench } from "lucide-react";
import { PestanasInferiores, PestanasSuperiores, type Seccion } from "../pestanas";

const SECCIONES: readonly Seccion[] = [
  { href: "/admin", titulo: "Inicio", icono: LayoutGrid },
  { href: "/admin/vueltas", titulo: "Vueltas", icono: Bus },
  { href: "/admin/programacion", titulo: "Salidas", icono: CalendarDays },
  { href: "/admin/repuestos", titulo: "Repuestos", icono: Wrench },
  { href: "/admin/pagos", titulo: "Pagos", icono: Receipt },
  { href: "/admin/reportes", titulo: "Reportes", icono: ChartColumn },
  // En el celular se llega desde Inicio o el engranaje del encabezado.
  { href: "/admin/configuracion", titulo: "Configuración", icono: Settings, soloEscritorio: true },
];

export function NavegacionAdminSuperior() {
  return <PestanasSuperiores secciones={SECCIONES} raiz="/admin" />;
}

export function NavegacionAdminInferior() {
  return <PestanasInferiores secciones={SECCIONES} raiz="/admin" />;
}
