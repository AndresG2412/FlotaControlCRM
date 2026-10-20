import Link from "next/link";
import { datosProgramacion } from "@/lib/admin/programacion";
import { exigirRol } from "@/lib/auth/sesion";
import { hoyEnBogota } from "@/lib/dominio/fechas";
import {
  calendarioDelMes,
  ETIQUETA_ESTADO_REGRESO,
  ETIQUETA_ESTADO_SALIDA,
  regresosEsperados,
} from "@/lib/dominio/programacion";
import { fechaCorta } from "../vueltas/etiquetas";
import { AccionesSalida, AdicionalDeTrayecto, NuevaAdicional, NuevaSalida } from "./controles";

export const metadata = { title: "Programación" };

// Diseño provisional: la presentación final la define la sección de diseño.
const tarjeta = "flex flex-col gap-3 rounded-2xl border border-borde bg-superficie p-4";
const campo = "h-10 rounded-xl border border-borde bg-superficie px-3 text-sm";

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const esMes = (v: string | undefined): v is string => Boolean(v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v));

export default async function Programacion({ searchParams }: PageProps<"/admin/programacion">) {
  await exigirRol("admin");
  const params = await searchParams;
  const hoy = hoyEnBogota();
  const mesUrl = uno(params.mes);
  const mes = esMes(mesUrl) ? mesUrl : hoy.slice(0, 7);

  const { placa, salidas, trayectosSinSalida } = await datosProgramacion(mes);
  const dias = calendarioDelMes(salidas, mes, hoy);
  const regresos = regresosEsperados(salidas, hoy).filter((r) => r.desde.startsWith(mes) || r.hasta.startsWith(mes) || r.estado === "atrasado");
  const porId = new Map(salidas.map((s) => [s.id, s]));
  const pendientesDelMes = salidas.filter((s) => s.estado === "pendiente" && s.fecha.startsWith(mes));

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Programación{placa ? ` · ${placa}` : ""}</h1>
        <Link href="/admin" className="text-sm text-marca underline">Panel</Link>
      </div>

      <form method="get" className="flex items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          Mes
          <input type="month" name="mes" defaultValue={mes} className={campo} />
        </label>
        <button className="h-10 rounded-xl bg-marca px-4 text-sm font-semibold text-marca-texto">Ver</button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2">
        <NuevaSalida mes={mes} />
        <NuevaAdicional mes={mes} />
      </div>

      {trayectosSinSalida.length > 0 && (
        <div className={`${tarjeta} border-aviso`}>
          <h2 className="font-semibold">Trayectos sin salida programada</h2>
          <p className="text-sm text-texto-suave">
            La buseta salió un día no programado o un regreso se corrió. Regístralo como adicional o enlázalo con una salida pendiente.
          </p>
          <ul className="flex flex-col gap-2">
            {trayectosSinSalida.map((t) => (
              <li key={t.id} className="flex flex-col gap-2 rounded-xl border border-borde p-3">
                <span className="text-sm">
                  {t.sentido === "ida" ? "Ida" : "Regreso"} del {fechaCorta(t.fecha)}
                  {t.hora_salida ? ` · ${t.hora_salida.slice(0, 5)}` : ""} ·{" "}
                  <Link href={`/admin/vueltas/${t.vuelta_id}`} className="text-marca underline">ver vuelta</Link>
                </span>
                <AdicionalDeTrayecto
                  trayecto={t}
                  pendientes={pendientesDelMes.filter((s) => s.sentido === t.sentido)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {regresos.length > 0 && (
        <div className={tarjeta}>
          <h2 className="font-semibold">Regresos</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {regresos.map((r) => {
              const ida = porId.get(r.idaId);
              return (
                <li key={r.idaId} className="flex flex-wrap justify-between gap-2 border-b border-borde py-1">
                  <span>Ida del {ida ? fechaCorta(ida.fecha) : "—"}{ida?.tipo === "adicional" ? " (adicional)" : ""}</span>
                  <span className={r.estado === "atrasado" ? "text-perdida" : r.estado === "pendiente" ? "text-aviso" : "text-texto-suave"}>
                    {ETIQUETA_ESTADO_REGRESO[r.estado]}
                    {r.estado === "hecho" || r.estado === "programado"
                      ? ` · ${fechaCorta(porId.get(r.regresoId ?? "")?.fecha ?? r.desde)}`
                      : ` · ${r.desde === r.hasta ? fechaCorta(r.desde) : `${fechaCorta(r.desde)} a ${fechaCorta(r.hasta)}`}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className={tarjeta}>
        <h2 className="font-semibold">Calendario</h2>
        <ul className="flex flex-col">
          {dias.map((d) => (
            <li key={d.fecha} className={`flex flex-col gap-1 border-b border-borde py-2 ${d.fecha === hoy ? "bg-marca/5" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium">{fechaCorta(d.fecha)}</span>
                <span className="text-xs text-texto-suave">
                  {d.enCali ? "En Cali esperando regreso" : d.disponible ? "Disponible" : ""}
                </span>
              </div>
              {d.salidas.map((s) => (
                <div key={s.id} className="flex flex-col gap-1 pl-3 text-sm">
                  <span className={s.estado.startsWith("cancelada") ? "text-texto-suave line-through" : ""}>
                    {s.sentido === "ida" ? "Ida" : "Regreso"}
                    {s.hora ? ` · ${s.hora}` : ""}
                    {s.tipo === "adicional" ? " · adicional" : ""} · {ETIQUETA_ESTADO_SALIDA[s.estado]}
                  </span>
                  {s.notas && <span className="text-xs text-texto-suave">{s.notas}</span>}
                  {s.estado === "pendiente" && <AccionesSalida salida={s} />}
                </div>
              ))}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
