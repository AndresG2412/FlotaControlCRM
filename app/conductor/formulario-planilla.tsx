"use client";

import { useState } from "react";
import { ZodError } from "zod";
import { formatearPesos, leerPesos } from "@/lib/dominio/dinero";
import { TERMINALES } from "@/lib/dominio/ruta";
import { guardarPlanilla } from "@/lib/offline/acciones-conductor";
import { sincronizarAhora } from "@/lib/offline/ciclo";
import { baseLocal } from "@/lib/offline/db";
import { guardarFoto } from "@/lib/offline/fotos";
import type { TerminalVista, TrayectoLocal } from "@/lib/offline/vista";

// Diseño provisional: la presentación final la define la sección de diseño.
const campo = "h-12 w-full neu-campo px-4 text-base";

export function FormularioPlanilla({
  uid,
  trayecto,
  terminal,
  alTerminar,
}: {
  uid: string;
  trayecto: TrayectoLocal;
  terminal: TerminalVista;
  alTerminar: () => void;
}) {
  const previa = terminal.planilla;
  const [emitida, setEmitida] = useState(previa?.emitida ?? true);
  const [neto, setNeto] = useState(previa?.neto != null ? String(previa.neto) : "");
  const [numero, setNumero] = useState(previa?.numero ?? "");
  const [pasajeros, setPasajeros] = useState(previa?.pasajeros != null ? String(previa.pasajeros) : "");
  const [motivo, setMotivo] = useState(previa?.motivo_sin_planilla ?? "");
  const [foto, setFoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const monto = emitida ? leerPesos(neto) : null;
    if (emitida && monto === null) return setError("Escribe el neto a pagar, sin decimales");

    setGuardando(true);
    try {
      const db = baseLocal();
      const foto_path = foto ? await guardarFoto(db, foto, uid) : (previa?.foto_path ?? null);
      await guardarPlanilla(db, trayecto, {
        id: previa?.id,
        terminal: terminal.codigo,
        emitida,
        neto: monto,
        numero: numero.trim() || null,
        pasajeros: pasajeros ? Number(pasajeros) : null,
        motivo_sin_planilla: emitida ? null : motivo.trim(),
        foto_path,
      });
      void sincronizarAhora().catch(() => undefined);
      alTerminar();
    } catch (err) {
      setError(err instanceof ZodError ? (err.issues[0]?.message ?? "Datos inválidos") : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  const montoLeido = leerPesos(neto);

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3 neu-tarjeta p-4">
      <h3 className="font-semibold">Planilla de {TERMINALES[terminal.codigo]}</h3>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setEmitida(true)}
          className={`h-11 neu-opcion ${emitida ? "neu-opcion-activa" : ""}`}>
          Hubo planilla
        </button>
        <button type="button" onClick={() => setEmitida(false)}
          className={`h-11 neu-opcion ${!emitida ? "neu-opcion-activa" : ""}`}>
          No hubo
        </button>
      </div>

      {emitida ? (
        <div className="grid grid-cols-1 gap-3 @lg:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm">Neto a pagar</span>
            <input className={campo} inputMode="numeric" value={neto} onChange={(e) => setNeto(e.target.value)} placeholder="600.000" autoFocus />
            {montoLeido !== null && <span className="monto text-xs text-texto-suave">{formatearPesos(montoLeido)}</span>}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">Número de planilla (opcional)</span>
            <input className={campo} value={numero} onChange={(e) => setNumero(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">Pasajeros en planilla (opcional)</span>
            <input className={campo} inputMode="numeric" value={pasajeros} onChange={(e) => setPasajeros(e.target.value.replace(/\D/g, ""))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">Foto (opcional)</span>
            <input type="file" accept="image/*" capture="environment" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
          </label>
        </div>
      ) : (
        <label className="flex flex-col gap-1">
          <span className="text-sm">¿Por qué no hubo planilla?</span>
          <input className={campo} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Terminal cerrada, no se vendió..." autoFocus />
        </label>
      )}

      {error && <p role="alert" className="text-sm text-perdida">{error}</p>}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={alTerminar} className="h-12 neu-boton">Cancelar</button>
        <button type="submit" disabled={guardando} className="h-12 neu-boton-marca">
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
