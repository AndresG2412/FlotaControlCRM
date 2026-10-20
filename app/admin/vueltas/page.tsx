import Link from "next/link";
import { listarVueltas, type VueltaEnLista } from "@/lib/admin/vueltas";
import { exigirRol } from "@/lib/auth/sesion";
import { formatearPesos } from "@/lib/dominio/dinero";
import { hoyEnBogota } from "@/lib/dominio/fechas";
import { esquemaFiltrosVueltas } from "@/lib/validaciones/admin";
import { ETIQUETA_ESTADO, ETIQUETA_TIPO, fechaCorta } from "./etiquetas";

export const metadata = { title: "Vueltas" };

// Diseño provisional: la presentación final la define la sección de diseño.
const campo = "h-10 rounded-xl border border-borde bg-superficie px-3 text-sm";

/** El primer valor de un parámetro de la URL. */
const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ListaVueltas({ searchParams }: PageProps<"/admin/vueltas">) {
  await exigirRol("admin");
  const params = await searchParams;

  // Sin mes en la URL se muestra el mes actual (Bogotá); "todos" quita el filtro.
  const mesUrl = uno(params.mes);
  const filtros = esquemaFiltrosVueltas.parse({
    mes: mesUrl === "todos" ? undefined : (mesUrl ?? hoyEnBogota().slice(0, 7)),
    estado: uno(params.estado) || undefined,
    tipo: uno(params.tipo) || undefined,
  });
  const vueltas = await listarVueltas(filtros);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Vueltas</h1>
        <Link href="/admin" className="text-sm text-marca underline">Panel</Link>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2 rounded-2xl border border-borde bg-superficie p-3">
        <label className="flex flex-col gap-1 text-sm">
          Mes
          <input type="month" name="mes" defaultValue={filtros.mes ?? ""} className={campo} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Estado
          <select name="estado" defaultValue={filtros.estado ?? ""} className={campo}>
            <option value="">Todos</option>
            {Object.entries(ETIQUETA_ESTADO).map(([valor, texto]) => (
              <option key={valor} value={valor}>{texto}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Tipo
          <select name="tipo" defaultValue={filtros.tipo ?? ""} className={campo}>
            <option value="">Todos</option>
            {Object.entries(ETIQUETA_TIPO).map(([valor, texto]) => (
              <option key={valor} value={valor}>{texto}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="h-10 rounded-xl bg-marca px-4 text-sm font-semibold text-marca-texto">Filtrar</button>
        <Link href="/admin/vueltas?mes=todos" className="h-10 content-center px-2 text-sm text-marca underline">Ver todas</Link>
      </form>

      <p className="text-sm text-texto-suave">
        {filtros.mes ? `Mes ${filtros.mes}` : "Todos los meses"} · {vueltas.length}{" "}
        {vueltas.length === 1 ? "vuelta" : "vueltas"}
      </p>

      {vueltas.length === 0 ? (
        <p className="rounded-2xl border border-borde bg-superficie p-4 text-texto-suave">No hay vueltas con esos filtros.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {vueltas.map((v) => <FilaVuelta key={v.id} vuelta={v} />)}
        </ul>
      )}
    </section>
  );
}

function FilaVuelta({ vuelta: v }: { vuelta: VueltaEnLista }) {
  const { registrada, sin_planilla, pendiente } = v.planillas;
  return (
    <li>
      <Link
        href={`/admin/vueltas/${v.id}`}
        className="flex flex-col gap-1 rounded-2xl border border-borde bg-superficie p-4 hover:border-marca"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{fechaCorta(v.fecha_inicio)}</span>
          {v.placa && <span className="text-sm text-texto-suave">{v.placa}</span>}
          <span className="rounded-full border border-borde px-2 text-xs">{ETIQUETA_ESTADO[v.estado]}</span>
          {v.tipo === "varada" && (
            <span className="rounded-full bg-aviso px-2 text-xs font-semibold text-superficie">Varada</span>
          )}
        </div>
        <span className="text-sm">
          Florencia: {v.conductorFlorencia ?? "sin asignar"} · Pitalito: {v.conductorPitalito ?? "sin asignar"}
        </span>
        <span className="text-sm text-texto-suave">
          {v.trayectos} {v.trayectos === 1 ? "trayecto" : "trayectos"}
          {v.faltan.length > 0 && ` (falta ${v.faltan.join(" y ")})`} · Planillas: {registrada} registradas
          {sin_planilla > 0 && `, ${sin_planilla} sin planilla`}
          {pendiente > 0 && <span className="text-aviso">, {pendiente} por registrar</span>}
        </span>
        {v.liquidacion !== null && v.tipo === "completa" && (
          <span className={`monto text-sm font-semibold ${v.liquidacion >= 0 ? "text-ganancia" : "text-perdida"}`}>
            {v.liquidacion >= 0 ? "Ganancia" : "Pérdida"} {formatearPesos(Math.abs(v.liquidacion))}
          </span>
        )}
        {v.tipo === "varada" && v.estado !== "en_curso" && <span className="text-sm text-texto-suave">Varada: no se liquida</span>}
      </Link>
    </li>
  );
}
