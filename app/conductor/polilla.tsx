"use client";

import { useState } from "react";
import { ZodError } from "zod";
import { formatearPesos, leerPesos } from "@/lib/dominio/dinero";
import { destinosDeEncomienda, terminalDeFacturacion, type DestinoSobrante } from "@/lib/dominio/polilla";
import {
  buscarTramo,
  destinosPosibles,
  terminalesConPlanilla,
  TERMINALES,
  tramosDe,
  type CodigoTerminal,
} from "@/lib/dominio/ruta";
import { guardarEncomienda, guardarPasajero } from "@/lib/offline/acciones-conductor";
import { sincronizarAhora } from "@/lib/offline/ciclo";
import { anular } from "@/lib/offline/cola";
import { baseLocal } from "@/lib/offline/db";
import type { EncomiendaVista, PasajeroVista, TrayectoVista } from "@/lib/offline/vista";

// Polilla del trayecto: pasajeros de vía y encomiendas, uno por uno.
// Regla dura: nada de sumas ni totales de dinero en esta pantalla.
// Diseño provisional: la presentación final la define la sección de diseño.

const campo = "h-12 w-full rounded-xl border border-borde bg-superficie px-4 text-base";
const boton = "h-12 w-full rounded-xl bg-marca font-semibold text-marca-texto disabled:opacity-60";
const botonSecundario = "h-12 w-full rounded-xl border border-borde disabled:opacity-60";
const opcion = (activa: boolean) =>
  `min-h-11 rounded-xl border px-3 text-sm ${activa ? "border-marca bg-marca text-marca-texto" : "border-borde"}`;

const refrescar = () => void sincronizarAhora().catch(() => undefined);

const nombreTramo = (id: string) => {
  const t = buscarTramo(id);
  return t ? `${TERMINALES[t.origen]} → ${TERMINALES[t.destino]}` : id;
};

const mensajeDe = (e: unknown) =>
  e instanceof ZodError ? (e.issues[0]?.message ?? "Datos inválidos") : "No se pudo guardar";

type Modo =
  | { tipo: "nada" }
  | { tipo: "pasajero"; editar?: PasajeroVista }
  | { tipo: "encomienda"; editar?: EncomiendaVista };

export function PolillaDelTrayecto({ trayecto }: { trayecto: TrayectoVista }) {
  const [modo, setModo] = useState<Modo>({ tipo: "nada" });
  const cerrar = () => setModo({ tipo: "nada" });

  return (
    <div className="flex flex-col gap-3 border-t border-borde pt-3">
      <h3 className="font-semibold">Polilla</h3>

      {modo.tipo === "pasajero" && <FormularioPasajero trayecto={trayecto} editar={modo.editar} alTerminar={cerrar} />}
      {modo.tipo === "encomienda" && <FormularioEncomienda trayecto={trayecto} editar={modo.editar} alTerminar={cerrar} />}
      {modo.tipo === "nada" && (
        <div className="grid grid-cols-2 gap-2">
          <button className={boton} onClick={() => setModo({ tipo: "pasajero" })}>+ Pasajero de vía</button>
          <button className={botonSecundario} onClick={() => setModo({ tipo: "encomienda" })}>+ Encomienda</button>
        </div>
      )}

      {trayecto.pasajeros.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Pasajeros de vía">
          {trayecto.pasajeros.map((p) => (
            <Fila
              key={p.id}
              titulo={`${nombreTramo(p.tramo_id)} · va a ${TERMINALES[p.destino]}`}
              detalle={[
                `Cobró ${formatearPesos(p.monto_cobrado)}`,
                p.facturado && p.terminal_facturacion
                  ? `facturó ${formatearPesos(p.monto_facturado)} en ${TERMINALES[p.terminal_facturacion]}`
                  : null,
                `sobran ${formatearPesos(p.sobrante)} ${p.destino_sobrante === "polilla" ? "a la caja" : "(me lo quedé)"}`,
              ]
                .filter(Boolean)
                .join(" · ")}
              sinEnviar={p.sinEnviar}
              alEditar={() => setModo({ tipo: "pasajero", editar: p })}
              alEliminar={() => eliminar("polilla_pasajeros", p.id, "este pasajero")}
            />
          ))}
        </ul>
      )}

      {trayecto.encomiendas.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Encomiendas">
          {trayecto.encomiendas.map((e) => (
            <Fila
              key={e.id}
              titulo={`Encomienda a ${TERMINALES[e.destino]}${e.descripcion ? ` · ${e.descripcion}` : ""}`}
              detalle={`${formatearPesos(e.monto)} · recibida ${
                e.recibida_en_terminal ? `en ${TERMINALES[e.recibida_en_terminal]}` : `en la vía (${nombreTramo(e.recibida_en_tramo ?? "")})`
              }`}
              sinEnviar={e.sinEnviar}
              alEditar={() => setModo({ tipo: "encomienda", editar: e })}
              alEliminar={() => eliminar("encomiendas", e.id, "esta encomienda")}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/** "Eliminar" anula con motivo (no hay borrado físico) y pide confirmación. */
async function eliminar(tabla: "polilla_pasajeros" | "encomiendas", id: string, que: string) {
  if (!window.confirm(`¿Seguro que quieres eliminar ${que}?`)) return;
  const motivo = window.prompt("¿Por qué se elimina?", "Registrado por error")?.trim();
  if (!motivo) return;
  await anular(baseLocal(), tabla, id, motivo);
  refrescar();
}

function Fila(props: {
  titulo: string;
  detalle: string;
  sinEnviar: boolean;
  alEditar: () => void;
  alEliminar: () => void;
}) {
  return (
    <li className="flex items-start justify-between gap-2 rounded-xl border border-borde px-4 py-3">
      <button onClick={props.alEditar} className="flex flex-1 flex-col text-left">
        <span className="font-medium">{props.titulo}</span>
        <span className="monto text-sm text-texto-suave">{props.detalle}</span>
        {props.sinEnviar && <span className="text-xs text-aviso">Sin enviar</span>}
      </button>
      <button onClick={props.alEliminar} className="text-sm text-perdida underline">Eliminar</button>
    </li>
  );
}

function FormularioPasajero({
  trayecto,
  editar,
  alTerminar,
}: {
  trayecto: TrayectoVista;
  editar?: PasajeroVista;
  alTerminar: () => void;
}) {
  const sentido = trayecto.trayecto.sentido;
  const [tramo, setTramo] = useState(editar?.tramo_id ?? trayecto.tramoActual.id);
  const destinos = destinosPosibles(tramo);
  const [destino, setDestino] = useState<CodigoTerminal>(editar?.destino ?? destinos[destinos.length - 1]);
  const [cobrado, setCobrado] = useState(editar ? String(editar.monto_cobrado) : "");
  const [facturado, setFacturado] = useState(editar?.facturado ? String(editar.monto_facturado) : "");
  const [destinoSobrante, setDestinoSobrante] = useState<DestinoSobrante>(editar?.destino_sobrante ?? "polilla");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardados, setGuardados] = useState(0);

  // Si cambia el tramo y el destino ya no aplica, se toma el último posible.
  const destinoValido = destinos.includes(destino) ? destino : destinos[destinos.length - 1];
  const factura = terminalDeFacturacion(tramo, destinoValido);
  const montoCobrado = leerPesos(cobrado);
  const montoFacturado = factura ? leerPesos(facturado) : 0;
  const sobrante = montoCobrado !== null && montoFacturado !== null ? montoCobrado - montoFacturado : null;

  async function guardar(seguir: boolean) {
    setError(null);
    if (montoCobrado === null || montoCobrado < 1) return setError("Escribe cuánto pagó el pasajero");
    if (factura && (montoFacturado === null || montoFacturado < 1)) {
      return setError(`Escribe cuánto se pagó en taquilla de ${TERMINALES[factura]}`);
    }
    setGuardando(true);
    try {
      await guardarPasajero(baseLocal(), trayecto.trayecto, {
        id: editar?.id,
        tramo_id: tramo,
        destino: destinoValido,
        monto_cobrado: montoCobrado,
        facturado: factura !== null,
        terminal_facturacion: factura,
        monto_facturado: montoFacturado ?? 0,
        destino_sobrante: destinoSobrante,
      });
      refrescar();
      if (seguir) {
        // Listo para el siguiente pasajero: mismo tramo y destino, montos en blanco.
        setCobrado("");
        setFacturado("");
        setGuardados((n) => n + 1);
      } else {
        alTerminar();
      }
    } catch (e) {
      setError(mensajeDe(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void guardar(false); }} className="flex flex-col gap-3 rounded-2xl border border-borde p-3">
      <h4 className="font-semibold">{editar ? "Corregir pasajero" : "Pasajero de vía"}</h4>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm">¿En qué tramo subió?</legend>
        <div className="grid grid-cols-1 gap-2">
          {tramosDe(sentido).map((t) => (
            <button key={t.id} type="button" className={opcion(tramo === t.id)} onClick={() => setTramo(t.id)}>
              {nombreTramo(t.id)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm">¿Hasta dónde va?</legend>
        <div className="grid grid-cols-3 gap-2">
          {destinos.map((d) => (
            <button key={d} type="button" className={opcion(destinoValido === d)} onClick={() => setDestino(d)}>
              {TERMINALES[d]}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1">
        <span className="text-sm">¿Cuánto pagó?</span>
        <input className={campo} inputMode="numeric" value={cobrado} onChange={(e) => setCobrado(e.target.value)} placeholder="80.000" autoFocus />
      </label>

      {factura ? (
        <label className="flex flex-col gap-1">
          <span className="text-sm">Pasa por {TERMINALES[factura]}: se factura allí. ¿Cuánto se pagó en taquilla?</span>
          <input className={campo} inputMode="numeric" value={facturado} onChange={(e) => setFacturado(e.target.value)} placeholder="55.000" />
        </label>
      ) : (
        <p className="text-sm text-texto-suave">Se baja en {TERMINALES[destinoValido]}: no se factura.</p>
      )}

      {sobrante !== null && sobrante >= 0 && (
        <fieldset className="flex flex-col gap-1">
          <legend className="monto mb-1 text-sm">Sobran {formatearPesos(sobrante)}. ¿A dónde van?</legend>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={opcion(destinoSobrante === "polilla")} onClick={() => setDestinoSobrante("polilla")}>
              A la caja (polilla)
            </button>
            <button type="button" className={opcion(destinoSobrante === "conductor")} onClick={() => setDestinoSobrante("conductor")}>
              Me lo quedé
            </button>
          </div>
        </fieldset>
      )}

      {error && <p role="alert" className="text-sm text-perdida">{error}</p>}
      {guardados > 0 && !error && <p className="text-xs text-texto-suave">Guardado. Registra el siguiente.</p>}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={botonSecundario} onClick={alTerminar}>{guardados > 0 ? "Listo" : "Cancelar"}</button>
        <button type="submit" className={boton} disabled={guardando}>Guardar</button>
      </div>
      {!editar && (
        <button type="button" className={botonSecundario} disabled={guardando} onClick={() => void guardar(true)}>
          Guardar y otro
        </button>
      )}
    </form>
  );
}

function FormularioEncomienda({
  trayecto,
  editar,
  alTerminar,
}: {
  trayecto: TrayectoVista;
  editar?: EncomiendaVista;
  alTerminar: () => void;
}) {
  const sentido = trayecto.trayecto.sentido;
  const [donde, setDonde] = useState<"terminal" | "via">(editar?.recibida_en_tramo ? "via" : "terminal");
  const [terminal, setTerminal] = useState<CodigoTerminal>(editar?.recibida_en_terminal ?? trayecto.tramoActual.origen);
  const [tramo, setTramo] = useState(editar?.recibida_en_tramo ?? trayecto.tramoActual.id);
  const lugar = donde === "terminal" ? { terminal } : { tramo };
  const destinos = destinosDeEncomienda(sentido, lugar);
  const [destino, setDestino] = useState<CodigoTerminal>(editar?.destino ?? destinos[destinos.length - 1]);
  const [descripcion, setDescripcion] = useState(editar?.descripcion ?? "");
  const [monto, setMonto] = useState(editar ? String(editar.monto) : "");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const destinoValido = destinos.includes(destino) ? destino : destinos[destinos.length - 1];

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const valor = leerPesos(monto);
    if (valor === null || valor < 1) return setError("Escribe cuánto quedó para la vuelta");
    setGuardando(true);
    try {
      await guardarEncomienda(baseLocal(), trayecto.trayecto, {
        id: editar?.id,
        recibida_en_terminal: donde === "terminal" ? terminal : null,
        recibida_en_tramo: donde === "via" ? tramo : null,
        destino: destinoValido,
        descripcion,
        monto: valor,
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
    <form onSubmit={guardar} className="flex flex-col gap-3 rounded-2xl border border-borde p-3">
      <h4 className="font-semibold">{editar ? "Corregir encomienda" : "Encomienda"}</h4>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={opcion(donde === "terminal")} onClick={() => setDonde("terminal")}>En terminal</button>
        <button type="button" className={opcion(donde === "via")} onClick={() => setDonde("via")}>En la vía</button>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {donde === "terminal"
          ? terminalesConPlanilla(sentido).map((t) => (
              <button key={t} type="button" className={opcion(terminal === t)} onClick={() => setTerminal(t)}>
                {TERMINALES[t]}
              </button>
            ))
          : tramosDe(sentido).map((t) => (
              <button key={t.id} type="button" className={opcion(tramo === t.id)} onClick={() => setTramo(t.id)}>
                {nombreTramo(t.id)}
              </button>
            ))}
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm">¿Para dónde va?</legend>
        <div className="grid grid-cols-3 gap-2">
          {destinos.map((d) => (
            <button key={d} type="button" className={opcion(destinoValido === d)} onClick={() => setDestino(d)}>
              {TERMINALES[d]}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1">
        <span className="text-sm">¿Qué es? (opcional, sin nombres ni teléfonos)</span>
        <input className={campo} value={descripcion} maxLength={200} onChange={(e) => setDescripcion(e.target.value)} placeholder="Caja mediana" />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm">¿Cuánto quedó para la vuelta? (neto)</span>
        <input className={campo} inputMode="numeric" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="15.000" />
      </label>

      {error && <p role="alert" className="text-sm text-perdida">{error}</p>}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={botonSecundario} onClick={alTerminar}>Cancelar</button>
        <button type="submit" className={boton} disabled={guardando}>Guardar</button>
      </div>
    </form>
  );
}
