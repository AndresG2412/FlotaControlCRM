"use client";

import Link from "next/link";
import { useState } from "react";
import { ZodError } from "zod";
import { formatearPesos, leerPesos } from "@/lib/dominio/dinero";
import { TERMINALES, type CodigoTerminal } from "@/lib/dominio/ruta";
import { guardarGasto } from "@/lib/offline/acciones-conductor";
import { sincronizarAhora } from "@/lib/offline/ciclo";
import { anular } from "@/lib/offline/cola";
import { baseLocal } from "@/lib/offline/db";
import { guardarFoto } from "@/lib/offline/fotos";
import type { GastoVista, TipoGasto, VistaVuelta } from "@/lib/offline/vista";

// Gastos variables de la vuelta, uno por uno (ACPM, ligas, otros, arreglos).
// Regla dura: nada de totales, "llevas gastado…" ni gastos fijos en esta pantalla.
// Diseño provisional: la presentación final la define la sección de diseño.

const campo = "h-12 w-full rounded-xl border border-borde bg-superficie px-4 text-base";
const boton = "h-12 w-full rounded-xl bg-marca font-semibold text-marca-texto disabled:opacity-60";
const botonSecundario = "h-12 w-full rounded-xl border border-borde disabled:opacity-60";
const opcion = (activa: boolean) =>
  `min-h-11 rounded-xl border px-3 text-sm ${activa ? "border-marca bg-marca text-marca-texto" : "border-borde"}`;

const refrescar = () => void sincronizarAhora().catch(() => undefined);

const ETIQUETA: Record<TipoGasto, string> = {
  acpm: "ACPM",
  liga: "Liga",
  extra: "Otro gasto",
  arreglo: "Arreglo en ruta",
};
const TIPOS: TipoGasto[] = ["acpm", "liga", "extra", "arreglo"];
const TERMINALES_LIGA: CodigoTerminal[] = ["florencia", "pitalito", "popayan", "cali"];

const mensajeDe = (e: unknown) =>
  e instanceof ZodError ? (e.issues[0]?.message ?? "Datos inválidos") : e instanceof Error ? e.message : "No se pudo guardar";

type Modo = { tipo: "nada" } | { tipo: "nuevo"; gasto: TipoGasto } | { tipo: "editar"; gasto: GastoVista };

export function GastosDeLaVuelta({ uid, vista }: { uid: string; vista: VistaVuelta }) {
  const [modo, setModo] = useState<Modo>({ tipo: "nada" });
  const cerrar = () => setModo({ tipo: "nada" });
  // El trayecto abierto (el último que se inició), si lo hay.
  const trayectoId = vista.regreso?.trayecto.id ?? vista.ida?.trayecto.id ?? null;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-borde bg-superficie p-4">
      <h2 className="font-semibold">Gastos</h2>

      {modo.tipo === "nada" ? (
        <div className="grid grid-cols-2 gap-2">
          {TIPOS.map((t) => (
            <button key={t} className={t === "acpm" ? boton : botonSecundario} onClick={() => setModo({ tipo: "nuevo", gasto: t })}>
              + {ETIQUETA[t]}
            </button>
          ))}
        </div>
      ) : (
        <FormularioGasto
          key={modo.tipo === "editar" ? modo.gasto.id : modo.gasto}
          uid={uid}
          vueltaId={vista.vuelta.id}
          trayectoId={trayectoId}
          tipo={modo.tipo === "editar" ? modo.gasto.tipo : modo.gasto}
          editar={modo.tipo === "editar" ? modo.gasto : undefined}
          alTerminar={cerrar}
        />
      )}

      {vista.gastos.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Gastos registrados">
          {vista.gastos.map((g) => (
            <li key={g.id} className="flex items-start justify-between gap-2 rounded-xl border border-borde px-4 py-3">
              <button onClick={() => setModo({ tipo: "editar", gasto: g })} className="flex flex-1 flex-col text-left">
                <span className="font-medium">
                  {ETIQUETA[g.tipo]}
                  {g.tipo === "liga" && g.terminal ? ` · ${TERMINALES[g.terminal]}` : ""}
                </span>
                <span className="monto text-sm text-texto-suave">
                  {[formatearPesos(g.monto), g.galones != null ? `${g.galones} gal` : null, g.lugar, g.descripcion]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                {g.sinEnviar && <span className="text-xs text-aviso">Sin enviar</span>}
              </button>
              <button onClick={() => eliminar(g.id)} className="text-sm text-perdida underline">Eliminar</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** "Eliminar" anula con motivo (no hay borrado físico) y pide confirmación. */
async function eliminar(id: string) {
  if (!window.confirm("¿Seguro que quieres eliminar este gasto?")) return;
  const motivo = window.prompt("¿Por qué se elimina?", "Registrado por error")?.trim();
  if (!motivo) return;
  await anular(baseLocal(), "gastos_variables", id, motivo);
  refrescar();
}

function FormularioGasto({
  uid,
  vueltaId,
  trayectoId,
  tipo,
  editar,
  alTerminar,
}: {
  uid: string;
  vueltaId: string;
  trayectoId: string | null;
  tipo: TipoGasto;
  editar?: GastoVista;
  alTerminar: () => void;
}) {
  const [monto, setMonto] = useState(editar ? String(editar.monto) : "");
  const [galones, setGalones] = useState(editar?.galones != null ? String(editar.galones) : "");
  const [lugar, setLugar] = useState(editar?.lugar ?? "");
  const [descripcion, setDescripcion] = useState(editar?.descripcion ?? "");
  const [terminal, setTerminal] = useState<CodigoTerminal | null>(editar?.terminal ?? null);
  const [foto, setFoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const valor = leerPesos(monto);
    if (valor === null || valor < 1) return setError("Escribe cuánto fue, sin decimales");
    // Los galones no son dinero: admiten decimales con coma o punto.
    const gal = galones.trim() ? Number(galones.replace(",", ".")) : null;
    if (gal !== null && (!Number.isFinite(gal) || gal <= 0)) return setError("Galones inválidos");

    setGuardando(true);
    try {
      const db = baseLocal();
      const foto_path = foto ? await guardarFoto(db, foto, uid) : (editar?.foto_path ?? null);
      await guardarGasto(db, { id: vueltaId }, {
        id: editar?.id,
        tipo,
        monto: valor,
        galones: gal,
        lugar,
        descripcion,
        terminal,
        trayecto_id: editar?.trayecto_id ?? trayectoId,
        foto_path,
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
    <form onSubmit={enviar} className="flex flex-col gap-3 rounded-2xl border border-borde p-3">
      <h3 className="font-semibold">{editar ? `Corregir ${ETIQUETA[tipo]}` : ETIQUETA[tipo]}</h3>

      {tipo === "liga" && (
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-sm">¿En qué terminal?</legend>
          <div className="grid grid-cols-2 gap-2">
            {TERMINALES_LIGA.map((t) => (
              <button key={t} type="button" className={opcion(terminal === t)} onClick={() => setTerminal(t)}>
                {TERMINALES[t]}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {(tipo === "extra" || tipo === "arreglo") && (
        <label className="flex flex-col gap-1">
          <span className="text-sm">{tipo === "arreglo" ? "¿Qué se arregló?" : "¿En qué fue?"}</span>
          <input className={campo} value={descripcion} maxLength={200} onChange={(e) => setDescripcion(e.target.value)} placeholder={tipo === "arreglo" ? "Llanta pinchada" : "Almuerzo"} />
        </label>
      )}
      {tipo === "arreglo" && (
        <p className="text-xs text-texto-suave">
          Si se cambió una pieza, regístrala también en <Link href="/conductor/repuestos" className="text-marca underline">Repuestos</Link>{" "}
          marcando &quot;se cambió en ruta&quot;, para que quede en el historial de la buseta.
        </p>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm">¿Cuánto fue?</span>
        <input className={campo} inputMode="numeric" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="150.000" autoFocus />
      </label>

      {tipo === "acpm" && (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-sm">Galones (opcional)</span>
            <input className={campo} inputMode="decimal" value={galones} onChange={(e) => setGalones(e.target.value)} placeholder="25,5" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">¿Dónde? (opcional)</span>
            <input className={campo} value={lugar} maxLength={120} onChange={(e) => setLugar(e.target.value)} placeholder="Estación de Pitalito" />
          </label>
        </>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm">Foto del recibo (opcional)</span>
        <input type="file" accept="image/*" capture="environment" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
        {editar?.foto_path && !foto && <span className="text-xs text-texto-suave">Ya tiene foto. Elige otra solo si quieres cambiarla.</span>}
      </label>

      {error && <p role="alert" className="text-sm text-perdida">{error}</p>}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={botonSecundario} onClick={alTerminar}>Cancelar</button>
        <button type="submit" className={boton} disabled={guardando}>Guardar</button>
      </div>
    </form>
  );
}
