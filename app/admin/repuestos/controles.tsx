"use client";

import { useState, useTransition } from "react";
import type { RepuestoAdmin } from "@/lib/admin/repuestos";
import { leerPesos } from "@/lib/dominio/dinero";
import { hoyEnBogota } from "@/lib/dominio/fechas";
import type { Categoria } from "@/lib/dominio/repuestos";
import { anularRepuesto, guardarRepuestoAdmin, type Resultado } from "./acciones";

// Diseño provisional: la presentación final la define la sección de diseño.
const campo = "h-10 w-full rounded-xl border border-borde bg-superficie px-3 text-sm";
const boton = "h-10 rounded-xl bg-marca px-4 text-sm font-semibold text-marca-texto disabled:opacity-60";
const botonSecundario = "h-10 rounded-xl border border-borde px-4 text-sm disabled:opacity-60";
const botonPeligro = "h-10 rounded-xl border border-perdida px-4 text-sm text-perdida disabled:opacity-60";

function useAccion() {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const ejecutar = (accion: () => Promise<Resultado>, alTerminar?: () => void) =>
    iniciar(async () => {
      setError(null);
      try {
        const r = await accion();
        if (r.error) setError(r.error);
        else alTerminar?.();
      } catch {
        setError("No se pudo completar. Revisa la conexión e intenta de nuevo.");
      }
    });
  return { pendiente, error, ejecutar };
}

const MensajeError = ({ mensaje }: { mensaje: string | null }) =>
  mensaje ? <p role="alert" className="text-sm text-perdida">{mensaje}</p> : null;

export function NuevoRepuesto({ busetaId, categorias }: { busetaId: string; categorias: Categoria[] }) {
  const [abierto, setAbierto] = useState(false);
  if (!abierto) {
    return <button className={`${boton} w-fit`} onClick={() => setAbierto(true)}>+ Registrar repuesto</button>;
  }
  return <FormularioRepuesto busetaId={busetaId} categorias={categorias} alTerminar={() => setAbierto(false)} />;
}

export function AccionesRepuesto({ repuesto, categorias }: { repuesto: RepuestoAdmin; categorias: Categoria[] }) {
  const [modo, setModo] = useState<"nada" | "corregir" | "eliminar">("nada");
  if (modo === "corregir") {
    return <FormularioRepuesto busetaId={repuesto.buseta_id} categorias={categorias} editar={repuesto} alTerminar={() => setModo("nada")} />;
  }
  if (modo === "eliminar") return <EliminarRepuesto id={repuesto.id} alTerminar={() => setModo("nada")} />;
  return (
    <div className="flex gap-2">
      <button type="button" className={botonSecundario} onClick={() => setModo("corregir")}>Corregir</button>
      <button type="button" className={botonPeligro} onClick={() => setModo("eliminar")}>Eliminar</button>
    </div>
  );
}

function FormularioRepuesto({
  busetaId,
  categorias,
  editar,
  alTerminar,
}: {
  busetaId: string;
  categorias: Categoria[];
  editar?: RepuestoAdmin;
  alTerminar: () => void;
}) {
  const [categoria, setCategoria] = useState(editar ? String(editar.categoria_id) : "");
  const [nombre, setNombre] = useState(editar?.nombre ?? "");
  const hoy = hoyEnBogota();
  const [fecha, setFecha] = useState(editar?.fecha_cambio ?? hoy);
  const [costo, setCosto] = useState(editar?.costo != null ? String(editar.costo) : "");
  const [taller, setTaller] = useState(editar?.taller ?? "");
  const [notas, setNotas] = useState(editar?.notas ?? "");
  const [aviso, setAviso] = useState<string | null>(null);
  const { pendiente, error, ejecutar } = useAccion();

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    setAviso(null);
    if (!categoria) return setAviso("Elige la categoría");
    if (!fecha || fecha > hoy) return setAviso("Elige la fecha del cambio (hoy o un día anterior)");
    const valorCosto = leerPesos(costo);
    if (valorCosto === null || valorCosto < 1) return setAviso("Escribe el precio en pesos, sin decimales");
    if (!taller.trim()) return setAviso("Escribe el taller");
    ejecutar(
      () =>
        guardarRepuestoAdmin({
          id: editar?.id,
          buseta_id: editar?.buseta_id ?? busetaId,
          categoria_id: Number(categoria),
          nombre,
          fecha_cambio: fecha,
          foto_path: editar?.foto_path ?? null,
          costo: valorCosto,
          taller: taller.trim(),
          notas: notas.trim() || null,
          vuelta_id: editar?.vuelta_id ?? null,
        }),
      alTerminar,
    );
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-2 rounded-2xl border border-borde bg-superficie p-4">
      <h2 className="font-semibold">{editar ? "Corregir repuesto" : "Registrar repuesto"}</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Categoría
          <select className={campo} value={categoria} onChange={(e) => setCategoria(e.target.value)} required>
            <option value="">Elige…</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          ¿Qué se cambió?
          <input className={campo} value={nombre} maxLength={120} required onChange={(e) => setNombre(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          ¿Cuándo se cambió?
          {/* Hoy por defecto; se puede elegir un día anterior, nunca uno futuro. */}
          <input type="date" className={campo} value={fecha} max={hoy} required onChange={(e) => setFecha(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Precio
          <input className={campo} inputMode="numeric" value={costo} required onChange={(e) => setCosto(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Taller
          <input className={campo} value={taller} maxLength={120} required onChange={(e) => setTaller(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          Notas (opcional)
          <textarea className="min-h-16 rounded-xl border border-borde bg-superficie p-2 text-sm" value={notas} maxLength={1000} onChange={(e) => setNotas(e.target.value)} />
        </label>
      </div>
      {!editar && <p className="text-xs text-texto-suave">La foto se agrega desde el celular (app del conductor).</p>}
      <MensajeError mensaje={aviso ?? error} />
      <div className="flex gap-2">
        <button type="button" className={botonSecundario} onClick={alTerminar}>Cancelar</button>
        <button type="submit" className={boton} disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  );
}

function EliminarRepuesto({ id, alTerminar }: { id: string; alTerminar: () => void }) {
  const [motivo, setMotivo] = useState("");
  const { pendiente, error, ejecutar } = useAccion();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        ejecutar(() => anularRepuesto({ id, motivo_anulacion: motivo.trim() }), alTerminar);
      }}
      className="flex flex-col gap-2 rounded-xl border border-perdida p-3"
    >
      <p className="text-sm font-medium">¿Seguro que quieres eliminar este repuesto?</p>
      <p className="text-xs text-texto-suave">No se borra: queda anulado con el motivo y sale del historial.</p>
      <label className="flex flex-col gap-1 text-sm">
        Motivo
        <input className={campo} value={motivo} maxLength={300} required onChange={(e) => setMotivo(e.target.value)} placeholder="Repetido, error…" />
      </label>
      <MensajeError mensaje={error} />
      <div className="flex gap-2">
        <button type="button" className={botonSecundario} onClick={alTerminar}>Cancelar</button>
        <button type="submit" className={botonPeligro} disabled={pendiente || !motivo.trim()}>
          {pendiente ? "Eliminando…" : "Sí, eliminar"}
        </button>
      </div>
    </form>
  );
}
