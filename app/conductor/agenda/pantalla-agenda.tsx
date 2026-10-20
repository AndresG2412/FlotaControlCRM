"use client";

import { diasEntre, hoyEnBogota } from "@/lib/dominio/fechas";
import {
  ETIQUETA_ESTADO_REGRESO,
  ETIQUETA_ESTADO_SALIDA,
  regresosEsperados,
  salidaDesdeFila,
  type FilaSalida,
  type Salida,
} from "@/lib/dominio/programacion";
import { baseLocal } from "@/lib/offline/db";
import { AJUSTE_PROGRAMACION, AJUSTE_VENCIMIENTOS, type VencimientoCache } from "@/lib/offline/descargar";
import { useConsulta } from "@/lib/offline/use-consulta";
import { fechaCorta } from "@/app/admin/vueltas/etiquetas";

// Agenda del conductor: próximas salidas, regreso pendiente y vencimientos
// (SOAT, seguro, tecnomecánica…). Solo fechas: nada de costos ni dinero.
// Diseño provisional: la presentación final la define la sección de diseño.

const tarjeta = "flex flex-col gap-3 rounded-2xl border border-borde bg-superficie p-4";

export function PantallaAgenda() {
  const datos = useConsulta(async () => {
    const db = baseLocal();
    const [programacion, vencimientos] = await Promise.all([
      db.ajustes.get(AJUSTE_PROGRAMACION),
      db.ajustes.get(AJUSTE_VENCIMIENTOS),
    ]);
    return {
      salidas: ((programacion?.valor as FilaSalida[] | undefined) ?? []).flatMap((f) => {
        const s = salidaDesdeFila(f);
        return s ? [s] : [];
      }),
      vencimientos: (vencimientos?.valor as VencimientoCache[] | undefined) ?? [],
      descargado: Boolean(programacion),
    };
  }, []);

  if (!datos) return <p className="py-8 text-center text-texto-suave">Cargando…</p>;
  if (!datos.descargado) {
    return (
      <section className={tarjeta}>
        <h1 className="text-lg font-semibold">Sin datos todavía</h1>
        <p className="text-texto-suave">Conéctate a internet una vez para descargar la programación.</p>
      </section>
    );
  }

  const hoy = hoyEnBogota();
  const proximas = datos.salidas.filter((s) => s.fecha >= hoy);
  const regresos = regresosEsperados(datos.salidas, hoy).filter((r) => r.estado === "pendiente" || r.estado === "atrasado");
  const vencimientos = [...datos.vencimientos]
    .filter((v) => v.fecha_vencimiento)
    .sort((a, b) => (a.fecha_vencimiento ?? "").localeCompare(b.fecha_vencimiento ?? ""));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Agenda</h1>

      {regresos.length > 0 && (
        <section className={`${tarjeta} border-aviso`}>
          <h2 className="font-semibold">Regreso pendiente</h2>
          {regresos.map((r) => (
            <p key={r.idaId} className="text-sm">
              {ETIQUETA_ESTADO_REGRESO[r.estado]}:{" "}
              {r.desde === r.hasta ? fechaCorta(r.desde) : `entre ${fechaCorta(r.desde)} y ${fechaCorta(r.hasta)}`}
            </p>
          ))}
        </section>
      )}

      <section className={tarjeta}>
        <h2 className="font-semibold">Próximas salidas</h2>
        {proximas.length === 0 ? (
          <p className="text-sm text-texto-suave">No hay salidas programadas.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {proximas.map((s: Salida) => (
              <li key={s.id} className={`flex justify-between gap-2 border-b border-borde py-1 ${s.estado.startsWith("cancelada") ? "text-texto-suave line-through" : ""}`}>
                <span>{fechaCorta(s.fecha)}{s.hora ? ` · ${s.hora}` : ""}</span>
                <span>
                  {s.sentido === "ida" ? "Ida" : "Regreso"}
                  {s.tipo === "adicional" ? " (adicional)" : ""}
                  {s.estado !== "pendiente" ? ` · ${ETIQUETA_ESTADO_SALIDA[s.estado]}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={tarjeta}>
        <h2 className="font-semibold">Vencimientos de la buseta</h2>
        {vencimientos.length === 0 ? (
          <p className="text-sm text-texto-suave">No hay vencimientos registrados.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {vencimientos.map((v) => {
              const dias = diasEntre(hoy, v.fecha_vencimiento!);
              return (
                <li key={v.id} className="flex justify-between gap-2 border-b border-borde py-1">
                  <span>{v.nombre}</span>
                  <span className={dias < 0 ? "text-perdida" : dias <= 30 ? "text-aviso" : "text-texto-suave"}>
                    {fechaCorta(v.fecha_vencimiento!)} · {dias < 0 ? `vencido hace ${-dias} días` : dias === 0 ? "vence hoy" : `faltan ${dias} días`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
