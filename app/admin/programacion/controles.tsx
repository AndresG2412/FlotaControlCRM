"use client";

import { useState, useTransition } from "react";
import type { SalidaAdmin, TrayectoSinSalida } from "@/lib/admin/programacion";
import { sumarDias } from "@/lib/dominio/fechas";
import type { Sentido } from "@/lib/dominio/ruta";
import {
  cancelarSalida,
  crearSalida,
  editarSalida,
  enlazarTrayecto,
  registrarAdicional,
  type Resultado,
} from "./acciones";

// Diseño provisional: la presentación final la define la sección de diseño.
const campo = "h-10 w-full rounded-xl border border-borde bg-superficie px-3 text-sm";
const boton = "h-10 rounded-xl bg-marca px-4 text-sm font-semibold text-marca-texto disabled:opacity-60";
const botonSecundario = "h-10 rounded-xl border border-borde px-4 text-sm disabled:opacity-60";
const tarjeta = "flex flex-col gap-2 rounded-2xl border border-borde bg-superficie p-4";

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

function CamposSalida(props: {
  fecha: string;
  hora: string;
  sentido: Sentido;
  setFecha: (v: string) => void;
  setHora: (v: string) => void;
  setSentido: (v: Sentido) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <label className="flex flex-col gap-1 text-sm">
        Fecha
        <input type="date" className={campo} value={props.fecha} required onChange={(e) => props.setFecha(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Hora
        <input type="time" className={campo} value={props.hora} onChange={(e) => props.setHora(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Sentido
        <select className={campo} value={props.sentido} onChange={(e) => props.setSentido(e.target.value === "regreso" ? "regreso" : "ida")}>
          <option value="ida">Ida</option>
          <option value="regreso">Regreso</option>
        </select>
      </label>
    </div>
  );
}

/** Digitar las salidas del mes rápido: al guardar, la fecha pasa al día siguiente. */
export function NuevaSalida({ mes }: { mes: string }) {
  const [fecha, setFecha] = useState(`${mes}-01`);
  const [hora, setHora] = useState("05:00");
  const [sentido, setSentido] = useState<Sentido>("ida");
  const [listo, setListo] = useState<string | null>(null);
  const { pendiente, error, ejecutar } = useAccion();

  return (
    <form
      className={tarjeta}
      onSubmit={(e) => {
        e.preventDefault();
        setListo(null);
        ejecutar(
          () => crearSalida({ fecha, hora: hora || null, sentido }),
          () => {
            setListo(`Guardada: ${sentido} del ${fecha}`);
            setFecha(sumarDias(fecha, 1));
          },
        );
      }}
    >
      <h2 className="font-semibold">Agregar salida programada</h2>
      <CamposSalida fecha={fecha} hora={hora} sentido={sentido} setFecha={setFecha} setHora={setHora} setSentido={setSentido} />
      <MensajeError mensaje={error} />
      {listo && <p className="text-xs text-texto-suave">{listo}. La fecha pasó al día siguiente.</p>}
      <button className={`${boton} w-fit`} disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar y seguir"}</button>
    </form>
  );
}

/** Salida en un día no programado: cancela la programada del día siguiente en el mismo sentido. */
export function NuevaAdicional({ mes }: { mes: string }) {
  const [abierto, setAbierto] = useState(false);
  const [fecha, setFecha] = useState(`${mes}-01`);
  const [hora, setHora] = useState("");
  const [sentido, setSentido] = useState<Sentido>("ida");
  const [notas, setNotas] = useState("");
  const { pendiente, error, ejecutar } = useAccion();

  if (!abierto) {
    return (
      <div className={tarjeta}>
        <h2 className="font-semibold">Salida adicional</h2>
        <p className="text-sm text-texto-suave">Cuando la buseta sale un día no programado porque había pasajeros.</p>
        <button className={`${botonSecundario} w-fit`} onClick={() => setAbierto(true)}>Registrar adicional</button>
      </div>
    );
  }
  return (
    <form
      className={tarjeta}
      onSubmit={(e) => {
        e.preventDefault();
        if (!window.confirm("Se cancelará la salida programada del día siguiente en el mismo sentido (si la hay). ¿Continuar?")) return;
        ejecutar(() => registrarAdicional({ fecha, hora: hora || null, sentido, notas: notas || null }), () => setAbierto(false));
      }}
    >
      <h2 className="font-semibold">Salida adicional</h2>
      <CamposSalida fecha={fecha} hora={hora} sentido={sentido} setFecha={setFecha} setHora={setHora} setSentido={setSentido} />
      <label className="flex flex-col gap-1 text-sm">
        Notas (opcional)
        <input className={campo} value={notas} maxLength={500} onChange={(e) => setNotas(e.target.value)} />
      </label>
      <MensajeError mensaje={error} />
      <div className="flex gap-2">
        <button type="button" className={botonSecundario} onClick={() => setAbierto(false)}>Cancelar</button>
        <button className={boton} disabled={pendiente}>{pendiente ? "Guardando…" : "Registrar"}</button>
      </div>
    </form>
  );
}

export function AccionesSalida({ salida }: { salida: SalidaAdmin }) {
  const [modo, setModo] = useState<"nada" | "editar" | "cancelar">("nada");
  const [fecha, setFecha] = useState(salida.fecha);
  const [hora, setHora] = useState(salida.hora ?? "");
  const [sentido, setSentido] = useState<Sentido>(salida.sentido);
  const [motivo, setMotivo] = useState("");
  const { pendiente, error, ejecutar } = useAccion();

  if (modo === "editar") {
    return (
      <form
        className="flex flex-col gap-2 rounded-xl border border-borde p-3"
        onSubmit={(e) => {
          e.preventDefault();
          ejecutar(() => editarSalida({ id: salida.id, fecha, hora: hora || null, sentido, notas: salida.notas }), () => setModo("nada"));
        }}
      >
        <CamposSalida fecha={fecha} hora={hora} sentido={sentido} setFecha={setFecha} setHora={setHora} setSentido={setSentido} />
        <MensajeError mensaje={error} />
        <div className="flex gap-2">
          <button type="button" className={botonSecundario} onClick={() => setModo("nada")}>Cancelar</button>
          <button className={boton} disabled={pendiente}>Guardar</button>
        </div>
      </form>
    );
  }
  if (modo === "cancelar") {
    return (
      <form
        className="flex flex-col gap-2 rounded-xl border border-perdida p-3"
        onSubmit={(e) => {
          e.preventDefault();
          ejecutar(() => cancelarSalida({ id: salida.id, motivo: motivo.trim() }), () => setModo("nada"));
        }}
      >
        <p className="text-sm">¿Cancelar esta salida? Queda marcada con el motivo, no se borra.</p>
        <input className={campo} value={motivo} maxLength={300} required onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo" />
        <MensajeError mensaje={error} />
        <div className="flex gap-2">
          <button type="button" className={botonSecundario} onClick={() => setModo("nada")}>Volver</button>
          <button className="h-10 rounded-xl border border-perdida px-4 text-sm text-perdida" disabled={pendiente || !motivo.trim()}>Sí, cancelar</button>
        </div>
      </form>
    );
  }
  return (
    <div className="flex gap-3 text-xs">
      <button className="text-marca underline" onClick={() => setModo("editar")}>Corregir</button>
      <button className="text-perdida underline" onClick={() => setModo("cancelar")}>Cancelar salida</button>
    </div>
  );
}

/** Resolver un trayecto sin salida: enlazarlo a una pendiente o registrarlo como adicional. */
export function AdicionalDeTrayecto({ trayecto, pendientes }: { trayecto: TrayectoSinSalida; pendientes: SalidaAdmin[] }) {
  const [salidaId, setSalidaId] = useState("");
  const { pendiente, error, ejecutar } = useAccion();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          className={boton}
          disabled={pendiente}
          onClick={() => {
            if (!window.confirm("Se registrará como adicional y se cancelará la salida programada del día siguiente en el mismo sentido (si la hay). ¿Continuar?")) return;
            ejecutar(() =>
              registrarAdicional({
                fecha: trayecto.fecha,
                hora: trayecto.hora_salida ? trayecto.hora_salida.slice(0, 5) : null,
                sentido: trayecto.sentido,
                notas: "Registrada desde un trayecto sin salida",
                trayecto_id: trayecto.id,
              }),
            );
          }}
        >
          Es una adicional
        </button>
        {pendientes.length > 0 && (
          <>
            <select className={`${campo} w-auto`} value={salidaId} onChange={(e) => setSalidaId(e.target.value)}>
              <option value="">Enlazar con…</option>
              {pendientes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fecha}{s.hora ? ` ${s.hora}` : ""} ({s.sentido})
                </option>
              ))}
            </select>
            <button
              className={botonSecundario}
              disabled={pendiente || !salidaId}
              onClick={() => ejecutar(() => enlazarTrayecto({ trayecto_id: trayecto.id, salida_id: salidaId }))}
            >
              Enlazar
            </button>
          </>
        )}
      </div>
      <MensajeError mensaje={error} />
    </div>
  );
}
