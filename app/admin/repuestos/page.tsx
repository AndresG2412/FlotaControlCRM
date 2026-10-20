import Link from "next/link";
import { busetaPrincipal, listarCategorias, listarRepuestos } from "@/lib/admin/repuestos";
import { exigirRol } from "@/lib/auth/sesion";
import { formatearPesos } from "@/lib/dominio/dinero";
import { formatearFechaHora, hoyEnBogota } from "@/lib/dominio/fechas";
import { diasDesde, ultimoPorCategoria } from "@/lib/dominio/repuestos";
import { esquemaFiltrosRepuestos } from "@/lib/validaciones/admin";
import { fechaCorta } from "../vueltas/etiquetas";
import { AccionesRepuesto, NuevoRepuesto } from "./controles";

export const metadata = { title: "Repuestos" };

// Diseño provisional: la presentación final la define la sección de diseño.
const campo = "h-10 rounded-xl border border-borde bg-superficie px-3 text-sm";
const tarjeta = "flex flex-col gap-3 rounded-2xl border border-borde bg-superficie p-4";

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function Repuestos({ searchParams }: PageProps<"/admin/repuestos">) {
  await exigirRol("admin");
  const params = await searchParams;
  const filtros = esquemaFiltrosRepuestos.parse({
    categoria: uno(params.categoria) || undefined,
    mes: uno(params.mes) || undefined,
    texto: uno(params.texto) || undefined,
    anulados: uno(params.anulados) || undefined,
  });

  const [categorias, repuestos, todosActivos, buseta] = await Promise.all([
    listarCategorias(),
    listarRepuestos(filtros),
    listarRepuestos(),
    busetaPrincipal(),
  ]);
  const hoy = hoyEnBogota();
  const ultimos = ultimoPorCategoria(categorias, todosActivos);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Repuestos</h1>
        <Link href="/admin" className="text-sm text-marca underline">Panel</Link>
      </div>

      {buseta && <NuevoRepuesto busetaId={buseta.id} categorias={categorias.filter((c) => c.activa)} />}

      <div className={tarjeta}>
        <h2 className="text-lg font-semibold">Último cambio por categoría</h2>
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {ultimos.map(({ categoria, ultimo }) => (
            <li key={categoria.id} className="flex justify-between gap-2 border-b border-borde py-1">
              <span className={categoria.activa ? "" : "text-texto-suave"}>{categoria.nombre}</span>
              <span className="text-right text-texto-suave">
                {ultimo ? `${ultimo.nombre} · ${fechaCorta(ultimo.fecha_cambio)} (hace ${diasDesde(ultimo.fecha_cambio, hoy)} días)` : "Sin registros"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2 rounded-2xl border border-borde bg-superficie p-3">
        <label className="flex flex-col gap-1 text-sm">
          Categoría
          <select name="categoria" defaultValue={filtros.categoria ?? ""} className={campo}>
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Mes
          <input type="month" name="mes" defaultValue={filtros.mes ?? ""} className={campo} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Buscar
          <input name="texto" defaultValue={filtros.texto ?? ""} className={campo} placeholder="pastillas…" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="anulados" value="1" defaultChecked={filtros.anulados} /> Incluir eliminados
        </label>
        <button type="submit" className="h-10 rounded-xl bg-marca px-4 text-sm font-semibold text-marca-texto">Filtrar</button>
        <Link href="/admin/repuestos" className="h-10 content-center px-2 text-sm text-marca underline">Quitar filtros</Link>
      </form>

      {repuestos.length === 0 ? (
        <p className="text-center text-sm text-texto-suave">No hay repuestos con ese filtro.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {repuestos.map((r) => (
            <li key={r.id} className={`${tarjeta} ${r.estado === "anulado" ? "opacity-70" : ""}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">{r.nombre}</span>
                <span className="rounded-full border border-borde px-2 text-xs">{r.categoria}</span>
              </div>
              <span className="monto text-sm text-texto-suave">
                {[
                  `Cambiado ${fechaCorta(r.fecha_cambio)}`,
                  r.costo != null && formatearPesos(r.costo),
                  r.taller,
                  r.vuelta_id && "cambiado en ruta",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              {r.notas && <span className="text-sm">{r.notas}</span>}
              {r.fotoUrl && (
                <a href={r.fotoUrl} target="_blank" rel="noopener noreferrer" className="w-fit">
                  {/* URL firmada de corta duración; next/image no aplica a URLs temporales. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.fotoUrl} alt={`Foto de ${r.nombre}`} className="max-h-40 rounded-lg border border-borde" />
                </a>
              )}
              <span className="text-xs text-texto-suave">
                Registró {r.registradoPor} · llegó {formatearFechaHora(r.sincronizado_en)}
                {r.revisar && <strong className="text-aviso"> · revisar hora (registrado sin señal con hora rara)</strong>}
                {r.actualizadoPor && r.actualizado_en && ` · Corrigió ${r.actualizadoPor} · ${formatearFechaHora(r.actualizado_en)}`}
              </span>
              {r.estado === "anulado" ? (
                <span className="text-sm text-texto-suave">Eliminado. Motivo: {r.motivo_anulacion}</span>
              ) : (
                <AccionesRepuesto repuesto={r} categorias={categorias.filter((c) => c.activa || c.id === r.categoria_id)} />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
