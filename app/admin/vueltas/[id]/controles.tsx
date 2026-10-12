"use client";

import { useState, useTransition } from "react";
import type { Persona, PlanillaDetalle } from "@/lib/admin/vueltas";
import { formatearPesos, leerPesos } from "@/lib/dominio/dinero";
import type { TipoVuelta } from "@/lib/dominio/vuelta";
import {
  actualizarVuelta,
  anularEncomienda,
  anularPasajero,
  anularPlanilla,
  corregirPlanilla,
  reabrirVuelta,
  type Resultado,
} from "../acciones";

// Diseño provisional: la presentación final la define la sección de diseño.
const campo = "h-10 w-full rounded-xl border border-borde bg-superficie px-3 text-sm";
const boton = "h-10 rounded-xl bg-marca px-4 text-sm font-semibold text-marca-texto disabled:opacity-60";
const botonSecundario = "h-10 rounded-xl border border-borde px-4 text-sm disabled:opacity-60";
const botonPeligro = "h-10 rounded-xl border border-perdida px-4 text-sm text-perdida disabled:opacity-60";

/** Ejecuta una Server Action y guarda su error (si lo hay). */
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

function MensajeError({ mensaje }: { mensaje: string | null }) {
  return mensaje ? <p role="alert" className="text-sm text-perdida">{mensaje}</p> : null;
}

export function AccionesPlanilla({ planilla }: { planilla: PlanillaDetalle }) {
  const [modo, setModo] = useState<"nada" | "corregir" | "eliminar">("nada");

  if (modo === "corregir") return <CorregirPlanilla planilla={planilla} alTerminar={() => setModo("nada")} />;
  if (modo === "eliminar") return <EliminarPlanilla planilla={planilla} alTerminar={() => setModo("nada")} />;
  return (
    <div className="flex gap-2">
      <button type="button" className={botonSecundario} onClick={() => setModo("corregir")}>Corregir</button>
      <button type="button" className={botonPeligro} onClick={() => setModo("eliminar")}>Eliminar</button>
    </div>
  );
}

function CorregirPlanilla({ planilla: p, alTerminar }: { planilla: PlanillaDetalle; alTerminar: () => void }) {
  const [emitida, setEmitida] = useState(p.emitida);
  const [neto, setNeto] = useState(p.neto != null ? String(p.neto) : "");
  const [numero, setNumero] = useState(p.numero ?? "");
  const [pasajeros, setPasajeros] = useState(p.pasajeros != null ? String(p.pasajeros) : "");
  const [motivo, setMotivo] = useState(p.motivo_sin_planilla ?? "");
  const [aviso, setAviso] = useState<string | null>(null);
  const { pendiente, error, ejecutar } = useAccion();
  const montoLeido = leerPesos(neto);

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    setAviso(null);
    if (emitida && montoLeido === null) return setAviso("Escribe el neto a pagar, sin decimales");
    ejecutar(
      () =>
        corregirPlanilla({
          id: p.id,
          emitida,
          neto: emitida ? montoLeido : null,
          numero: emitida ? numero.trim() || null : null,
          pasajeros: emitida && pasajeros ? Number(pasajeros) : null,
          motivo_sin_planilla: emitida ? null : motivo.trim() || null,
        }),
      alTerminar,
    );
  }

  return (
    <form onSubmit={guardar} className="mt-1 flex flex-col gap-2 rounded-xl border border-borde p-3">
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1">
          <input type="radio" checked={emitida} onChange={() => setEmitida(true)} /> Hubo planilla
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" checked={!emitida} onChange={() => setEmitida(false)} /> No hubo
        </label>
      </div>
      {emitida ? (
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            Neto a pagar
            <input className={campo} inputMode="numeric" value={neto} onChange={(e) => setNeto(e.target.value)} />
            {montoLeido !== null && <span className="monto text-xs text-texto-suave">{formatearPesos(montoLeido)}</span>}
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Número (opcional)
            <input className={campo} value={numero} maxLength={40} onChange={(e) => setNumero(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Pasajeros (opcional)
            <input className={campo} inputMode="numeric" value={pasajeros} onChange={(e) => setPasajeros(e.target.value.replace(/\D/g, ""))} />
          </label>
        </div>
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          ¿Por qué no hubo planilla?
          <input className={campo} value={motivo} maxLength={300} onChange={(e) => setMotivo(e.target.value)} />
        </label>
      )}
      <MensajeError mensaje={aviso ?? error} />
      <div className="flex gap-2">
        <button type="button" className={botonSecundario} onClick={alTerminar}>Cancelar</button>
        <button type="submit" className={boton} disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar corrección"}</button>
      </div>
    </form>
  );
}

function EliminarPlanilla({ planilla: p, alTerminar }: { planilla: PlanillaDetalle; alTerminar: () => void }) {
  const [motivo, setMotivo] = useState("");
  const { pendiente, error, ejecutar } = useAccion();

  function eliminar(e: React.FormEvent) {
    e.preventDefault();
    ejecutar(() => anularPlanilla({ id: p.id, motivo_anulacion: motivo.trim() }), alTerminar);
  }

  return (
    <form onSubmit={eliminar} className="mt-1 flex flex-col gap-2 rounded-xl border border-perdida p-3">
      <p className="text-sm font-medium">¿Seguro que quieres eliminar esta planilla?</p>
      <p className="text-xs text-texto-suave">No se borra: queda anulada con el motivo, y la terminal vuelve a quedar por registrar.</p>
      <label className="flex flex-col gap-1 text-sm">
        Motivo
        <input className={campo} value={motivo} maxLength={300} required onChange={(e) => setMotivo(e.target.value)} placeholder="Repetida, terminal equivocada…" />
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

type DatosVueltaForm = {
  id: string;
  tipo: TipoVuelta;
  conductor_florencia_id: string | null;
  conductor_pitalito_id: string | null;
};

export function EditarVuelta({ vuelta, conductores }: { vuelta: DatosVueltaForm; conductores: Persona[] }) {
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<TipoVuelta>(vuelta.tipo);
  const [florencia, setFlorencia] = useState(vuelta.conductor_florencia_id ?? "");
  const [pitalito, setPitalito] = useState(vuelta.conductor_pitalito_id ?? "");
  const { pendiente, error, ejecutar } = useAccion();

  if (!abierto) {
    return (
      <button type="button" className={`${botonSecundario} w-fit`} onClick={() => setAbierto(true)}>
        Cambiar conductores o tipo
      </button>
    );
  }

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    ejecutar(
      () =>
        actualizarVuelta({
          id: vuelta.id,
          tipo,
          conductor_florencia_id: florencia || null,
          conductor_pitalito_id: pitalito || null,
        }),
      () => setAbierto(false),
    );
  }

  const opciones = (
    <>
      <option value="">Sin asignar</option>
      {conductores.map((c) => (
        <option key={c.id} value={c.id}>{c.nombre}</option>
      ))}
    </>
  );

  return (
    <form onSubmit={guardar} className="flex flex-col gap-2 rounded-xl border border-borde p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          Conductor Florencia
          <select className={campo} value={florencia} onChange={(e) => setFlorencia(e.target.value)}>{opciones}</select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Conductor Pitalito
          <select className={campo} value={pitalito} onChange={(e) => setPitalito(e.target.value)}>{opciones}</select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Tipo
          <select className={campo} value={tipo} onChange={(e) => setTipo(e.target.value === "varada" ? "varada" : "completa")}>
            <option value="completa">Completa</option>
            <option value="varada">Varada</option>
          </select>
        </label>
      </div>
      {tipo !== vuelta.tipo && (
        <p className="text-xs text-aviso">
          {tipo === "varada"
            ? "Como varada, la vuelta queda en $0: se quitan sus gastos fijos."
            : "Como completa, se cargan los gastos fijos vigentes a la fecha de la vuelta."}
        </p>
      )}
      <MensajeError mensaje={error} />
      <div className="flex gap-2">
        <button type="button" className={botonSecundario} onClick={() => setAbierto(false)}>Cancelar</button>
        <button type="submit" className={boton} disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  );
}

export function ReabrirVuelta({ id }: { id: string }) {
  const [confirmar, setConfirmar] = useState(false);
  const { pendiente, error, ejecutar } = useAccion();

  return (
    <div className="flex flex-col gap-2">
      {confirmar ? (
        <div className="flex flex-col gap-2 rounded-xl border border-borde p-3">
          <p className="text-sm">¿Reabrir la vuelta? Vuelve a quedar en curso y los conductores pueden seguir registrando.</p>
          <div className="flex gap-2">
            <button type="button" className={botonSecundario} onClick={() => setConfirmar(false)}>Cancelar</button>
            <button type="button" className={boton} disabled={pendiente} onClick={() => ejecutar(() => reabrirVuelta({ id }), () => setConfirmar(false))}>
              {pendiente ? "Reabriendo…" : "Sí, reabrir"}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className={`${botonSecundario} w-fit`} onClick={() => setConfirmar(true)}>Reabrir vuelta</button>
      )}
      <MensajeError mensaje={error} />
    </div>
  );
}

/** Eliminar (anular con motivo) un pasajero de vía o una encomienda. */
export function EliminarDePolilla({ tipo, id }: { tipo: "pasajero" | "encomienda"; id: string }) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const { pendiente, error, ejecutar } = useAccion();
  const que = tipo === "pasajero" ? "este pasajero" : "esta encomienda";

  if (!abierto) {
    return (
      <button type="button" className={botonPeligro} onClick={() => setAbierto(true)}>Eliminar</button>
    );
  }

  function eliminar(e: React.FormEvent) {
    e.preventDefault();
    const accion = tipo === "pasajero" ? anularPasajero : anularEncomienda;
    ejecutar(() => accion({ id, motivo_anulacion: motivo.trim() }), () => setAbierto(false));
  }

  return (
    <form onSubmit={eliminar} className="mt-1 flex flex-col gap-2 rounded-xl border border-perdida p-3">
      <p className="text-sm font-medium">¿Seguro que quieres eliminar {que}?</p>
      <p className="text-xs text-texto-suave">No se borra: queda anulado con el motivo y deja de sumar en la vuelta.</p>
      <label className="flex flex-col gap-1 text-sm">
        Motivo
        <input className={campo} value={motivo} maxLength={300} required onChange={(e) => setMotivo(e.target.value)} placeholder="Repetido, error de monto…" />
      </label>
      <MensajeError mensaje={error} />
      <div className="flex gap-2">
        <button type="button" className={botonSecundario} onClick={() => setAbierto(false)}>Cancelar</button>
        <button type="submit" className={botonPeligro} disabled={pendiente || !motivo.trim()}>
          {pendiente ? "Eliminando…" : "Sí, eliminar"}
        </button>
      </div>
    </form>
  );
}
