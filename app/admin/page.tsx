import { Bus, CalendarDays, ClipboardList, Receipt, Settings, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { exigirRol } from "@/lib/auth/sesion";

const MODULOS: { titulo: string; detalle: string; icono: LucideIcon; href?: string }[] = [
  { titulo: "Vueltas", detalle: "Trayectos, planillas y conductores", icono: Bus, href: "/admin/vueltas" },
  { titulo: "Programación", detalle: "Salidas del mes, regresos y adicionales", icono: CalendarDays },
  { titulo: "Repuestos", detalle: "Historial por categoría y fecha", icono: Wrench },
  { titulo: "Pagos y vencimientos", detalle: "SOAT, seguro, tecnomecánica, cuota", icono: Receipt },
  { titulo: "Reportes", detalle: "Por vuelta, mes y conductor", icono: ClipboardList },
  { titulo: "Configuración", detalle: "Gastos fijos y conductores", icono: Settings, href: "/admin/configuracion" },
];

const tarjeta = "flex gap-3 rounded-2xl border border-borde bg-superficie p-4";

export default async function PanelAdmin() {
  await exigirRol("admin");
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Panel</h1>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODULOS.map(({ titulo, detalle, icono: Icono, href }) => {
          const contenido = (
            <>
              <Icono className="mt-0.5 size-5 shrink-0 text-marca" aria-hidden />
              <div className="flex flex-col gap-1">
                <span className="font-medium">{titulo}</span>
                <span className="text-sm text-texto-suave">{detalle}</span>
                {!href && <span className="text-xs text-aviso">En construcción</span>}
              </div>
            </>
          );
          return (
            <li key={titulo}>
              {href ? (
                <Link href={href} className={`${tarjeta} h-full hover:border-marca`}>{contenido}</Link>
              ) : (
                <div className={`${tarjeta} h-full`}>{contenido}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
