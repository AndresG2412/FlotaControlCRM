import { Bus, CalendarDays, ClipboardList, Receipt, Settings, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { listarPagos } from "@/lib/admin/pagos";
import { exigirRol } from "@/lib/auth/sesion";
import { hoyEnBogota } from "@/lib/dominio/fechas";
import { estadoVencimiento, ETIQUETA_VENCIMIENTO, vigentes } from "@/lib/dominio/vencimientos";

const MODULOS: { titulo: string; detalle: string; icono: LucideIcon; href?: string }[] = [
  { titulo: "Vueltas", detalle: "Trayectos, planillas y conductores", icono: Bus, href: "/admin/vueltas" },
  { titulo: "Programación", detalle: "Salidas del mes, regresos y adicionales", icono: CalendarDays, href: "/admin/programacion" },
  { titulo: "Repuestos", detalle: "Historial por categoría y fecha", icono: Wrench, href: "/admin/repuestos" },
  { titulo: "Pagos y vencimientos", detalle: "SOAT, seguro, tecnomecánica, cuota", icono: Receipt, href: "/admin/pagos" },
  { titulo: "Reportes", detalle: "Por vuelta, mes y conductor", icono: ClipboardList },
  { titulo: "Configuración", detalle: "Gastos fijos y categorías de repuestos", icono: Settings, href: "/admin/configuracion" },
];

const tarjeta = "flex gap-3 rounded-2xl border border-borde bg-superficie p-4";

export default async function PanelAdmin() {
  await exigirRol("admin");
  const hoy = hoyEnBogota();
  // Pagos que piden atención: vencidos, con recordatorio llegado o por vencer.
  const atencion = vigentes((await listarPagos()).filter((p) => p.estado === "activo"))
    .map((p) => ({ pago: p, estado: estadoVencimiento(p, hoy) }))
    .filter(({ estado }) => estado === "vencido" || estado === "recordar" || estado === "por_vencer");

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Panel</h1>
      {atencion.length > 0 && (
        <Link href="/admin/pagos" className="flex flex-col gap-1 rounded-2xl border border-aviso bg-superficie p-4">
          <span className="font-semibold text-aviso">Pagos por renovar</span>
          {atencion.map(({ pago, estado }) => (
            <span key={pago.id} className="text-sm">
              {pago.nombre}: {ETIQUETA_VENCIMIENTO[estado]}
              {pago.fecha_vencimiento ? ` (vence ${pago.fecha_vencimiento})` : ""}
            </span>
          ))}
        </Link>
      )}
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
