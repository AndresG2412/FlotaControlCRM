import Link from "next/link";
import { datosReporte } from "@/lib/admin/reportes";
import { exigirRol } from "@/lib/auth/sesion";
import { formatearPesos } from "@/lib/dominio/dinero";
import { hoyEnBogota, rangoDelMes } from "@/lib/dominio/fechas";
import { cuentaEnTotales, porConductor, porMes, resumir } from "@/lib/dominio/reportes";
import { ETIQUETA_ESTADO, ETIQUETA_TIPO, fechaCorta } from "../vueltas/etiquetas";

export const metadata = { title: "Reportes" };

// Diseño provisional: la presentación final la define la sección de diseño.
// Las sumas se hacen aquí sobre reporte_vueltas (solo admin); nunca se guardan.
const tarjeta = "flex flex-col gap-3 rounded-2xl border border-borde bg-superficie p-4";
const campo = "h-10 rounded-xl border border-borde bg-superficie px-3 text-sm";

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const esMes = (v: string | undefined): v is string => Boolean(v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v));

/** Primer día del mes que está `n` meses antes de "YYYY-MM". */
function mesesAtras(mes: string, n: number): string {
  const [a, m] = mes.split("-").map(Number);
  const fecha = new Date(Date.UTC(a, m - 1 - n, 1));
  return fecha.toISOString().slice(0, 10);
}

const Monto = ({ valor, color = false }: { valor: number; color?: boolean }) => (
  <span className={`monto ${color ? (valor < 0 ? "text-perdida" : valor > 0 ? "text-ganancia" : "") : ""}`}>{formatearPesos(valor)}</span>
);

export default async function Reportes({ searchParams }: PageProps<"/admin/reportes">) {
  await exigirRol("admin");
  const params = await searchParams;
  const mesUrl = uno(params.mes);
  const mes = esMes(mesUrl) ? mesUrl : hoyEnBogota().slice(0, 7);
  const { hasta } = rangoDelMes(mes);

  // Un año hacia atrás para la tendencia; el mes elegido para el detalle.
  const { filas: filasAnio, quedos: quedosAnio, nombres } = await datosReporte(mesesAtras(mes, 11), hasta);
  const filas = filasAnio.filter((f) => f.fecha_inicio.startsWith(mes));
  const quedos = quedosAnio; // por conductor se muestra el año (más representativo)
  const resumen = resumir(filas);
  const meses = porMes(filasAnio);
  const conductores = porConductor(filasAnio, quedos);
  const nombre = (id: string | null) => (id ? (nombres[id] ?? "Usuario desconocido") : "—");

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Reportes</h1>
        <Link href="/admin" className="text-sm text-marca underline">Panel</Link>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          Mes
          <input type="month" name="mes" defaultValue={mes} className={campo} />
        </label>
        <button className="h-10 rounded-xl bg-marca px-4 text-sm font-semibold text-marca-texto">Ver</button>
        <a href={`/admin/reportes/csv?mes=${mes}`} className="h-10 content-center px-2 text-sm text-marca underline">Descargar CSV del mes</a>
      </form>

      <div className={tarjeta}>
        <h2 className="text-lg font-semibold">Resumen de {mes}</h2>
        <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {[
            ["Vueltas (sin contar en curso)", `${resumen.vueltas} · ${resumen.completas} completas · ${resumen.varadas} varadas`],
            ["Sin cerrar (sin cuadre)", String(resumen.sinCerrar)],
          ].map(([t, v]) => (
            <div key={t} className="flex justify-between gap-2"><dt className="text-texto-suave">{t}</dt><dd>{v}</dd></div>
          ))}
          <div className="flex justify-between gap-2"><dt className="text-texto-suave">Ingreso real</dt><dd><Monto valor={resumen.ingresoReal} /></dd></div>
          <div className="flex justify-between gap-2"><dt className="text-texto-suave">Gastos fijos</dt><dd><Monto valor={resumen.gastosFijos} /></dd></div>
          <div className="flex justify-between gap-2"><dt className="text-texto-suave">Gastos variables</dt><dd><Monto valor={resumen.gastosVariables} /></dd></div>
          <div className="flex justify-between gap-2 font-semibold"><dt>Liquidación</dt><dd><Monto valor={resumen.liquidacion} color /></dd></div>
          <div className="flex justify-between gap-2"><dt className="text-texto-suave">Promedio por vuelta completa</dt><dd><Monto valor={resumen.promedioPorVuelta} color /></dd></div>
          <div className="flex justify-between gap-2"><dt className="text-texto-suave">Se quedó el conductor</dt><dd><Monto valor={resumen.quedoConductor} /></dd></div>
          <div className="flex justify-between gap-2"><dt className="text-texto-suave">Diferencias de cuadre</dt><dd><Monto valor={resumen.diferenciaCuadre} color /></dd></div>
        </dl>
      </div>

      <div className={tarjeta}>
        <h2 className="text-lg font-semibold">Por vuelta</h2>
        {filas.length === 0 ? (
          <p className="text-sm text-texto-suave">No hay vueltas en este mes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-texto-suave">
                <tr>
                  <th className="py-1 pr-2">Fecha</th><th className="pr-2">Tipo / estado</th><th className="pr-2">Conductores</th>
                  <th className="pr-2 text-right">Ingreso</th><th className="pr-2 text-right">Gastos</th>
                  <th className="pr-2 text-right">Liquidación</th><th className="pr-2 text-right">Se quedó</th><th className="text-right">Cuadre</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.vuelta_id} className={`border-t border-borde ${cuentaEnTotales(f) ? "" : "text-texto-suave"}`}>
                    <td className="py-1 pr-2"><Link href={`/admin/vueltas/${f.vuelta_id}`} className="text-marca underline">{fechaCorta(f.fecha_inicio)}</Link></td>
                    <td className="pr-2">{ETIQUETA_TIPO[f.tipo]} · {ETIQUETA_ESTADO[f.estado]}</td>
                    <td className="pr-2">{nombre(f.conductor_florencia_id)} / {nombre(f.conductor_pitalito_id)}</td>
                    <td className="pr-2 text-right"><Monto valor={f.ingreso_real} /></td>
                    <td className="pr-2 text-right"><Monto valor={f.gastos_fijos + f.gastos_variables} /></td>
                    <td className="pr-2 text-right"><Monto valor={f.liquidacion} color /></td>
                    <td className="pr-2 text-right"><Monto valor={f.quedo_conductor} /></td>
                    <td className="text-right">{f.diferencia_cuadre === null ? "—" : <Monto valor={f.diferencia_cuadre} color />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-texto-suave">Las vueltas en curso aparecen en gris y no suman en el resumen.</p>
      </div>

      <div className={tarjeta}>
        <h2 className="text-lg font-semibold">Por conductor (últimos 12 meses)</h2>
        {conductores.length === 0 ? (
          <p className="text-sm text-texto-suave">Sin datos.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {conductores.map((c) => (
              <li key={c.conductorId} className="flex flex-col gap-1 rounded-xl border border-borde p-3">
                <span className="font-medium">{nombre(c.conductorId)}</span>
                <span className="text-texto-suave">
                  {c.vueltas} vueltas ({c.comoFlorencia} como Florencia, {c.comoPitalito} como Pitalito)
                </span>
                <span>Liquidación de sus vueltas: <Monto valor={c.liquidacionVueltas} color /></span>
                <span>Registró como &quot;me lo quedé&quot;: <strong><Monto valor={c.quedoConductor} /></strong></span>
                <span>Diferencias de cuadre en sus vueltas: <Monto valor={c.diferenciaCuadre} color /></span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-texto-suave">La liquidación y el cuadre son de la vuelta (compartidos por los dos conductores).</p>
      </div>

      <div className={tarjeta}>
        <h2 className="text-lg font-semibold">Por mes</h2>
        <ul className="flex flex-col text-sm">
          {meses.map(({ mes: m, resumen: r }) => (
            <li key={m} className="flex flex-wrap justify-between gap-2 border-b border-borde py-1">
              <Link href={`/admin/reportes?mes=${m}`} className="text-marca underline">{m}</Link>
              <span>{r.completas} completas · ingreso <Monto valor={r.ingresoReal} /> · liquidación <Monto valor={r.liquidacion} color /></span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
