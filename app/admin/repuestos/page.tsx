import Link from "next/link";
import { busetaPrincipal, listarCategorias, listarRepuestos } from "@/lib/admin/repuestos";
import { exigirRol } from "@/lib/auth/sesion";
import { formatearPesos } from "@/lib/dominio/dinero";
import { fechaNumerica, formatearFechaHora } from "@/lib/dominio/fechas";
import { ultimoPorCategoria } from "@/lib/dominio/repuestos";
import { esquemaFiltrosRepuestos } from "@/lib/validaciones/admin";
import { AccionesRepuesto, NuevoRepuesto } from "./controles";

export const metadata = { title: "Repuestos" };

// Diseño provisional: la presentación final la define la sección de diseño.
const campo = "h-10 neu-campo px-3 text-sm";
const tarjeta = "flex flex-col gap-3 neu-tarjeta p-4";

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
  const ultimos = ultimoPorCategoria(categorias, todosActivos);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="titulo-pagina">Repuestos</h1>
        <Link href="/admin" className="text-sm text-marca underline">Panel</Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start">
        <div className="flex flex-col gap-6 lg:order-2">
          {buseta && <NuevoRepuesto busetaId={buseta.id} categorias={categorias.filter((c) => c.activa)} />}

          <div className={tarjeta}>
            <h2 className="text-lg font-semibold">Último cambio por categoría</h2>
            <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm @xl:grid-cols-2">
              {ultimos.map(({ categoria, ultimo }) => (
                <li key={categoria.id} className="flex justify-between gap-2 border-b border-borde py-1">
                  <span className={categoria.activa ? "" : "text-texto-suave"}>{categoria.nombre}</span>
                  <span className="text-right text-texto-suave">
                    {ultimo ? fechaNumerica(ultimo.fecha_cambio) : "Sin registros"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <form method="get" className="flex flex-wrap items-end gap-2 neu-tarjeta p-3">
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
            <button type="submit" className="h-10 neu-boton-marca px-4 text-sm">Filtrar</button>
            <Link href="/admin/repuestos" className="h-10 content-center px-2 text-sm text-marca underline">Quitar filtros</Link>
          </form>

          {repuestos.length === 0 ? (
            <p className="text-center text-sm text-texto-suave">No hay repuestos con ese filtro.</p>
          ) : (
            <ul className="grid gap-5 md:grid-cols-2 md:items-start">
              {repuestos.map((r) => (
                <li key={r.id} className={`${tarjeta} ${r.estado === "anulado" ? "opacity-70" : ""}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{r.nombre}</span>
                    <span className="neu-chip px-2 text-xs">{r.categoria}</span>
                  </div>
                  <span className="monto text-sm text-texto-suave">
                    {[
                      `Cambiado ${fechaNumerica(r.fecha_cambio)}`,
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
                      <img src={r.fotoUrl} alt={`Foto de ${r.nombre}`} className="max-h-40 neu-foto" />
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
        </div>
      </div>
    </section>
  );
}
