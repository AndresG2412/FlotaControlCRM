import { Bus, CalendarDays, ClipboardList, Receipt, Settings, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const MODULOS: { titulo: string; detalle: string; icono: LucideIcon }[] = [
  { titulo: "Vueltas", detalle: "Planillas, polilla, gastos, liquidación y cuadre", icono: Bus },
  { titulo: "Programación", detalle: "Salidas del mes, regresos y adicionales", icono: CalendarDays },
  { titulo: "Repuestos", detalle: "Historial por categoría y fecha", icono: Wrench },
  { titulo: "Pagos y vencimientos", detalle: "SOAT, seguro, tecnomecánica, cuota", icono: Receipt },
  { titulo: "Reportes", detalle: "Por vuelta, mes y conductor", icono: ClipboardList },
  { titulo: "Configuración", detalle: "Tarifas, gastos fijos, conductores", icono: Settings },
];

export default function PanelAdmin() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Panel</h1>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODULOS.map(({ titulo, detalle, icono: Icono }) => (
          <li key={titulo} className="flex gap-3 rounded-2xl border border-borde bg-superficie p-4">
            <Icono className="mt-0.5 size-5 shrink-0 text-marca" aria-hidden />
            <div className="flex flex-col gap-1">
              <span className="font-medium">{titulo}</span>
              <span className="text-sm text-texto-suave">{detalle}</span>
              <span className="text-xs text-aviso">En construcción</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
