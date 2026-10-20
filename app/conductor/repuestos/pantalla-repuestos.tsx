"use client";

import { useState } from "react";
import { ZodError } from "zod";
import { formatearPesos, leerPesos } from "@/lib/dominio/dinero";
import { hoyEnBogota } from "@/lib/dominio/fechas";
import { fechaCorta } from "@/app/admin/vueltas/etiquetas";
import { diasDesde, filtrarRepuestos, ultimoPorCategoria } from "@/lib/dominio/repuestos";
import { guardarRepuesto } from "@/lib/offline/acciones-conductor";
import { sincronizarAhora } from "@/lib/offline/ciclo";
import { anular, idsSinSincronizar } from "@/lib/offline/cola";
import { baseLocal } from "@/lib/offline/db";
import {
  AJUSTE_BUSETAS,
  AJUSTE_CATEGORIAS,
  AJUSTE_PERSONAS,
  type BusetaCache,
  type CategoriaCache,
  type ConductorCache,
} from "@/lib/offline/descargar";
import { guardarFoto } from "@/lib/offline/fotos";
import { useConsulta } from "@/lib/offline/use-consulta";
import { armarVista } from "@/lib/offline/vista";
import { armarRepuestos, type RepuestoVista } from "@/lib/offline/vista-repuestos";

// Repuestos de la buseta: historial compartido y registro sin señal.
// Diseño provisional: la presentación final la define la sección de diseño.

const campo = "h-12 w-full rounded-xl border border-borde bg-superficie px-4 text-base";
const boton = "h-12 w-full rounded-xl bg-marca font-semibold text-marca-texto disabled:opacity-60";
const botonSecundario = "h-12 w-full rounded-xl border border-borde disabled:opacity-60";
const tarjeta = "flex flex-col gap-3 rounded-2xl border border-borde bg-superficie p-4";
const opcion = (activa: boolean) =>
  `min-h-10 rounded-xl border px-3 text-sm ${activa ? "border-marca bg-marca text-marca-texto" : "border-borde"}`;

const refrescar = () => void sincronizarAhora().catch(() => undefined);

const mensajeDe = (e: unknown) =>
  e instanceof ZodError ? (e.issues[0]?.message ?? "Datos inválidos") : e instanceof Error ? e.message : "No se pudo guardar";

type Modo = { tipo: "lista" } | { tipo: "nuevo" } | { tipo: "editar"; repuesto: RepuestoVista };

export function PantallaRepuestos({ uid }: { uid: string }) {
  const datos = useConsulta(async () => {
    const db = baseLocal();
    const [registros, sinEnviar, categorias, busetas, personas] = await Promise.all([
      db.registros.toArray(),
      idsSinSincronizar(db),
      db.ajustes.get(AJUSTE_CATEGORIAS),
      db.ajustes.get(AJUSTE_BUSETAS),
      db.ajustes.get(AJUSTE_PERSONAS),
    ]);
    return {
      repuestos: armarRepuestos(registros, uid, sinEnviar),
      vueltaEnCurso: armarVista(registros, uid, sinEnviar),
      categorias: (categorias?.valor as CategoriaCache[] | undefined) ?? [],
      busetas: (busetas?.valor as BusetaCache[] | undefined) ?? [],
      personas: (personas?.valor as ConductorCache[] | undefined) ?? [],
    };
  }, [uid]);

  const [modo, setModo] = useState<Modo>({ tipo: "lista" });
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [texto, setTexto] = useState("");

  if (!datos) return <p className="py-8 text-center text-texto-suave">Cargando…</p>;
  const { repuestos, vueltaEnCurso, categorias, busetas, personas } = datos;

  if (busetas.length === 0 || categorias.length === 0) {
    return (
      <section className={tarjeta}>
        <h1 className="text-lg font-semibold">Sin datos todavía</h1>
        <p className="text-texto-suave">Conéctate a internet una vez para descargar las categorías y el historial.</p>
        <button className={botonSecundario} onClick={refrescar}>Reintentar</button>
      </section>
    );
  }

  const nombreCategoria = (id: number) => categorias.find((c) => c.id === id)?.nombre ?? "Sin categoría";
  const nombrePersona = (id?: string | null) => (id ? (personas.find((p) => p.id === id)?.nombre ?? "Otro usuario") : "");
  const activas = categorias.filter((c) => c.activa);

  if (modo.tipo !== "lista") {
    return (
      <FormularioRepuesto
        uid={uid}
        busetaId={busetas[0].id}
        vueltaEnCursoId={vueltaEnCurso?.asignado ? vueltaEnCurso.vuelta.id : null}
        categorias={activas}
        editar={modo.tipo === "editar" ? modo.repuesto : undefined}
        alTerminar={() => setModo({ tipo: "lista" })}
      />
    );
  }

  const hoy = hoyEnBogota();
  const ultimos = ultimoPorCategoria(activas, repuestos).filter((u) => u.ultimo);
  const lista = filtrarRepuestos(repuestos, { categoriaId, texto });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Repuestos</h1>
      </div>
      <button className={boton} onClick={() => setModo({ tipo: "nuevo" })}>+ Registrar repuesto</button>

      {ultimos.length > 0 && (
        <section className={tarjeta}>
          <h2 className="font-semibold">Último cambio por categoría</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {ultimos.map(({ categoria, ultimo }) => (
              <li key={categoria.id} className="flex justify-between gap-2">
                <span>{categoria.nombre}</span>
                <span className="text-right text-texto-suave">
                  {ultimo!.nombre} · hace {diasDesde(ultimo!.fecha_cambio, hoy)} días
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <input className={campo} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar: pastillas, aceite…" aria-label="Buscar repuesto" />
        <div className="flex flex-wrap gap-2">
          <button className={opcion(categoriaId === null)} onClick={() => setCategoriaId(null)}>Todas</button>
          {activas.map((c) => (
            <button key={c.id} className={opcion(categoriaId === c.id)} onClick={() => setCategoriaId(c.id)}>
              {c.nombre}
            </button>
          ))}
        </div>
      </section>

      {lista.length === 0 ? (
        <p className="text-center text-sm text-texto-suave">No hay repuestos con ese filtro.</p>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Historial de repuestos">
          {lista.map((r) => (
            <li key={r.id} className="flex flex-col gap-1 rounded-xl border border-borde p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{r.nombre}</span>
                <span className="text-xs text-texto-suave">{nombreCategoria(r.categoria_id)}</span>
              </div>
              <span className="monto text-sm text-texto-suave">
                {[
                  fechaCorta(r.fecha_cambio),
                  r.costo != null && formatearPesos(r.costo),
                  r.taller,
                  r.foto_path && "con foto",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              {r.notas && <span className="text-sm">{r.notas}</span>}
              <span className="text-xs text-texto-suave">
                Registró {r.propio ? "tú" : nombrePersona(r.registrado_por)}
                {r.sinEnviar && <span className="text-aviso"> · sin enviar</span>}
                {r.revisar && <span className="text-aviso"> · revisar hora</span>}
              </span>
              {r.propio && (
                <div className="flex gap-3 text-sm">
                  <button className="text-marca underline" onClick={() => setModo({ tipo: "editar", repuesto: r })}>Corregir</button>
                  <button className="text-perdida underline" onClick={() => void eliminar(r.id)}>Eliminar</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** "Eliminar" anula con motivo (no hay borrado físico) y pide confirmación. */
async function eliminar(id: string) {
  if (!window.confirm("¿Seguro que quieres eliminar este repuesto?")) return;
  const motivo = window.prompt("¿Por qué se elimina?", "Registrado por error")?.trim();
  if (!motivo) return;
  await anular(baseLocal(), "repuestos", id, motivo);
  refrescar();
}

function FormularioRepuesto({
  uid,
  busetaId,
  vueltaEnCursoId,
  categorias,
  editar,
  alTerminar,
}: {
  uid: string;
  busetaId: string;
  vueltaEnCursoId: string | null;
  categorias: CategoriaCache[];
  editar?: RepuestoVista;
  alTerminar: () => void;
}) {
  const [categoriaId, setCategoriaId] = useState<number | null>(editar?.categoria_id ?? null);
  const [nombre, setNombre] = useState(editar?.nombre ?? "");
  const hoy = hoyEnBogota();
  const [fecha, setFecha] = useState(editar?.fecha_cambio ?? hoy);
  const [costo, setCosto] = useState(editar?.costo != null ? String(editar.costo) : "");
  const [taller, setTaller] = useState(editar?.taller ?? "");
  const [notas, setNotas] = useState(editar?.notas ?? "");
  const [enRuta, setEnRuta] = useState(Boolean(editar?.vuelta_id));
  const [foto, setFoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (categoriaId === null) return setError("Elige la categoría");
    if (!fecha || fecha > hoy) return setError("Elige la fecha del cambio (hoy o un día anterior)");
    const valorCosto = leerPesos(costo);
    if (valorCosto === null || valorCosto < 1) return setError("Escribe el precio en pesos, sin decimales");
    if (!taller.trim()) return setError("Escribe el taller");

    setGuardando(true);
    try {
      const db = baseLocal();
      const foto_path = foto ? await guardarFoto(db, foto, uid) : (editar?.foto_path ?? null);
      await guardarRepuesto(db, uid, {
        id: editar?.id,
        buseta_id: editar?.buseta_id ?? busetaId,
        categoria_id: categoriaId,
        nombre,
        fecha_cambio: fecha,
        foto_path,
        costo: valorCosto,
        taller,
        notas,
        vuelta_id: enRuta ? (editar?.vuelta_id ?? vueltaEnCursoId) : null,
      });
      refrescar();
      alTerminar();
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className={tarjeta}>
      <h1 className="text-lg font-semibold">{editar ? "Corregir repuesto" : "Registrar repuesto"}</h1>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm">Categoría</legend>
        <div className="flex flex-wrap gap-2">
          {categorias.map((c) => (
            <button key={c.id} type="button" className={opcion(categoriaId === c.id)} onClick={() => setCategoriaId(c.id)}>
              {c.nombre}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1">
        <span className="text-sm">¿Qué se cambió?</span>
        <input className={campo} value={nombre} maxLength={120} onChange={(e) => setNombre(e.target.value)} placeholder="Pastillas de freno delanteras" />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm">¿Cuándo se cambió?</span>
        {/* Hoy por defecto; se puede elegir un día anterior, nunca uno futuro. */}
        <input type="date" className={campo} value={fecha} max={hoy} required onChange={(e) => setFecha(e.target.value)} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm">Foto (opcional)</span>
        <input type="file" accept="image/*" capture="environment" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
        {editar?.foto_path && !foto && <span className="text-xs text-texto-suave">Ya tiene foto; elige otra solo si quieres cambiarla.</span>}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm">Precio</span>
        <input className={campo} inputMode="numeric" value={costo} required onChange={(e) => setCosto(e.target.value)} placeholder="180.000" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm">Taller</span>
        <input className={campo} value={taller} maxLength={120} required onChange={(e) => setTaller(e.target.value)} placeholder="Taller El Paisa" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm">Notas (opcional)</span>
        <textarea className="min-h-20 w-full rounded-xl border border-borde bg-superficie p-3 text-base" value={notas} maxLength={1000} onChange={(e) => setNotas(e.target.value)} />
      </label>

      {(vueltaEnCursoId || editar?.vuelta_id) && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-5" checked={enRuta} onChange={(e) => setEnRuta(e.target.checked)} />
          Se cambió en ruta, durante la vuelta en curso
        </label>
      )}

      {error && <p role="alert" className="text-sm text-perdida">{error}</p>}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={botonSecundario} onClick={alTerminar}>Cancelar</button>
        <button type="submit" className={boton} disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  );
}
