import Link from "next/link";
import { listarPagos } from "@/lib/admin/pagos";
import { exigirRol } from "@/lib/auth/sesion";
import { formatearPesos } from "@/lib/dominio/dinero";
import { diasEntre, hoyEnBogota } from "@/lib/dominio/fechas";
import { estadoVencimiento, ETIQUETA_VENCIMIENTO, vigentes, type EstadoVencimiento } from "@/lib/dominio/vencimientos";
import { fechaCorta } from "../vueltas/etiquetas";
import { EliminarPago, FormularioPago } from "./controles";

export const metadata = { title: "Pagos y vencimientos" };

// Diseño provisional: la presentación final la define la sección de diseño.
const tarjeta = "flex flex-col gap-3 rounded-2xl border border-borde bg-superficie p-4";

const COLOR: Record<EstadoVencimiento, string> = {
  vencido: "text-perdida",
  recordar: "text-aviso",
  por_vencer: "text-aviso",
  al_dia: "text-ganancia",
  sin_vencimiento: "text-texto-suave",
};

export default async function Pagos() {
  const perfil = await exigirRol("admin");
  const pagos = await listarPagos();
  const activos = pagos.filter((p) => p.estado === "activo");
  const hoy = hoyEnBogota();
  const actuales = vigentes(activos);
  const conceptos = actuales.map((p) => p.nombre);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Pagos y vencimientos</h1>
        <Link href="/admin" className="text-sm text-marca underline">Panel</Link>
      </div>

      <FormularioPago uid={perfil.id} conceptos={conceptos} />

      <div className={tarjeta}>
        <h2 className="text-lg font-semibold">Vigentes</h2>
        {actuales.length === 0 ? (
          <p className="text-sm text-texto-suave">Aún no hay pagos registrados.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {actuales.map((p) => {
              const estado = estadoVencimiento(p, hoy);
              return (
                <li key={p.id} className="flex flex-col gap-1 rounded-xl border border-borde p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{p.nombre}</span>
                    <span className={`text-sm font-semibold ${COLOR[estado]}`}>{ETIQUETA_VENCIMIENTO[estado]}</span>
                  </div>
                  <span className="monto text-sm text-texto-suave">
                    {[
                      `Pagado ${fechaCorta(p.fecha_pago)} · ${formatearPesos(p.costo)}`,
                      p.fecha_vencimiento &&
                        `vence ${fechaCorta(p.fecha_vencimiento)} (${(() => {
                          const d = diasEntre(hoy, p.fecha_vencimiento);
                          return d < 0 ? `hace ${-d} días` : d === 0 ? "hoy" : `en ${d} días`;
                        })()})`,
                      p.fecha_recordatorio && `recordar ${fechaCorta(p.fecha_recordatorio)}`,
                      p.recordatorio_enviado_en && "correo enviado",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <FormularioPago uid={perfil.id} conceptos={conceptos} renovar={p.nombre} />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className={tarjeta}>
        <h2 className="text-lg font-semibold">Historial</h2>
        <ul className="flex flex-col gap-2">
          {pagos.map((p) => (
            <li key={p.id} className={`flex flex-col gap-1 rounded-xl border border-borde p-3 ${p.estado === "anulado" ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">{p.nombre}</span>
                <span className="monto text-sm">{formatearPesos(p.costo)}</span>
              </div>
              <span className="text-sm text-texto-suave">
                Pagado {fechaCorta(p.fecha_pago)}
                {p.fecha_vencimiento ? ` · vence ${fechaCorta(p.fecha_vencimiento)}` : ""}
                {p.creadoPor ? ` · registró ${p.creadoPor}` : ""}
              </span>
              {p.notas && <span className="text-sm">{p.notas}</span>}
              {p.comprobanteUrl && (
                <a href={p.comprobanteUrl} target="_blank" rel="noopener noreferrer" className="w-fit text-sm text-marca underline">
                  Ver comprobante
                </a>
              )}
              {p.estado === "anulado" ? (
                <span className="text-sm text-texto-suave">Eliminado. Motivo: {p.motivo_anulacion}</span>
              ) : (
                <EliminarPago id={p.id} />
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
