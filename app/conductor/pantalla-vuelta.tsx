"use client";

import { useState } from "react";
import { formatearPesos } from "@/lib/dominio/dinero";
import { TERMINALES, tramosDe, type CodigoTerminal, type Sentido } from "@/lib/dominio/ruta";
import {
  finalizarVuelta,
  iniciarTrayecto,
  iniciarVuelta,
  marcarVarada,
  YaHayVueltaEnCurso,
} from "@/lib/offline/acciones-conductor";
import { sincronizarAhora } from "@/lib/offline/ciclo";
import { idsSinSincronizar } from "@/lib/offline/cola";
import { baseLocal } from "@/lib/offline/db";
import {
  AJUSTE_BUSETAS,
  AJUSTE_CONDUCTORES,
  type BusetaCache,
  type ConductorCache,
} from "@/lib/offline/descargar";
import { useConsulta } from "@/lib/offline/use-consulta";
import { armarVista, type TerminalVista, type TrayectoVista, type VistaVuelta } from "@/lib/offline/vista";
import { unirseAVuelta } from "./acciones";
import { FormularioPlanilla } from "./formulario-planilla";
import { PolillaDelTrayecto } from "./polilla";

// Regla dura: aquí no se muestran sumas ni totales de dinero, solo registros sueltos.
// Diseño provisional: la presentación final la define la sección de diseño.

const boton = "h-12 w-full rounded-xl bg-marca font-semibold text-marca-texto disabled:opacity-60";
const botonSecundario = "h-12 w-full rounded-xl border border-borde";
const tarjeta = "flex flex-col gap-3 rounded-2xl border border-borde bg-superficie p-4";

const refrescar = () => void sincronizarAhora().catch(() => undefined);

export function PantallaVuelta({ uid }: { uid: string }) {
  const datos = useConsulta(async () => {
    const db = baseLocal();
    const [registros, sinEnviar, busetas, conductores] = await Promise.all([
      db.registros.toArray(),
      idsSinSincronizar(db),
      db.ajustes.get(AJUSTE_BUSETAS),
      db.ajustes.get(AJUSTE_CONDUCTORES),
    ]);
    return {
      vista: armarVista(registros, uid, sinEnviar),
      busetas: (busetas?.valor as BusetaCache[] | undefined) ?? [],
      conductores: (conductores?.valor as ConductorCache[] | undefined) ?? [],
    };
  }, [uid]);

  if (!datos) return <p className="py-8 text-center text-texto-suave">Cargando…</p>;
  const { vista, busetas, conductores } = datos;

  if (!vista) return <IniciarVuelta uid={uid} busetas={busetas} conductores={conductores} />;
  if (!vista.asignado) return <UnirseAVuelta vista={vista} conductores={conductores} />;
  return <VueltaEnCurso uid={uid} vista={vista} conductores={conductores} />;
}

function nombreDe(conductores: ConductorCache[], id: string | null) {
  if (!id) return "Sin asignar";
  return conductores.find((c) => c.id === id)?.nombre ?? "Conductor";
}

function IniciarVuelta({ uid, busetas, conductores }: { uid: string; busetas: BusetaCache[]; conductores: ConductorCache[] }) {
  const [puesto, setPuesto] = useState<"florencia" | "pitalito">("florencia");
  const [companero, setCompanero] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (busetas.length === 0) {
    return (
      <section className={tarjeta}>
        <h1 className="text-lg font-semibold">Sin datos todavía</h1>
        <p className="text-texto-suave">Conéctate a internet una vez para descargar la buseta y los conductores.</p>
        <button className={botonSecundario} onClick={refrescar}>Reintentar</button>
      </section>
    );
  }

  async function iniciar() {
    setError(null);
    try {
      await iniciarVuelta(baseLocal(), { uid, busetaId: busetas[0].id, puesto, companeroId: companero || null });
      refrescar();
    } catch (e) {
      setError(e instanceof YaHayVueltaEnCurso ? e.message : "No se pudo iniciar la vuelta");
    }
  }

  return (
    <section className={tarjeta}>
      <h1 className="text-lg font-semibold">Iniciar vuelta</h1>
      <p className="text-sm text-texto-suave">Buseta {busetas[0].placa}{busetas[0].numero_interno ? ` · ${busetas[0].numero_interno}` : ""}</p>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm">Yo voy como</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["florencia", "pitalito"] as const).map((p) => (
            <button key={p} type="button" onClick={() => setPuesto(p)}
              className={`h-11 rounded-xl border ${puesto === p ? "border-marca bg-marca text-marca-texto" : "border-borde"}`}>
              Conductor {p === "florencia" ? "Florencia" : "Pitalito"}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1">
        <span className="text-sm">Compañero</span>
        <select className="h-12 rounded-xl border border-borde bg-superficie px-3" value={companero} onChange={(e) => setCompanero(e.target.value)}>
          <option value="">Todavía no sé</option>
          {conductores.filter((c) => c.id !== uid).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </label>
      {error && <p role="alert" className="text-sm text-perdida">{error}</p>}
      <button className={boton} onClick={iniciar}>Iniciar vuelta</button>
    </section>
  );
}

function UnirseAVuelta({ vista, conductores }: { vista: VistaVuelta; conductores: ConductorCache[] }) {
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const { vuelta } = vista;

  async function unirse(puesto: "florencia" | "pitalito") {
    setError(null);
    if (!navigator.onLine) return setError("Para unirte a la vuelta necesitas señal");
    setEnviando(true);
    const r = await unirseAVuelta({ vuelta_id: vuelta.id, puesto });
    setEnviando(false);
    if (r.error) return setError(r.error);
    refrescar();
  }

  return (
    <section className={tarjeta}>
      <h1 className="text-lg font-semibold">Hay una vuelta en curso</h1>
      <p className="text-sm text-texto-suave">
        Empezó el {vuelta.fecha_inicio}. Florencia: {nombreDe(conductores, vuelta.conductor_florencia_id)} · Pitalito:{" "}
        {nombreDe(conductores, vuelta.conductor_pitalito_id)}
      </p>
      <p className="text-sm">No se puede empezar otra hasta terminar esta. Únete para registrar en ella:</p>
      <button className={boton} disabled={enviando} onClick={() => unirse("florencia")}>Unirme como conductor Florencia</button>
      <button className={botonSecundario} disabled={enviando} onClick={() => unirse("pitalito")}>Unirme como conductor Pitalito</button>
      {error && <p role="alert" className="text-sm text-perdida">{error}</p>}
    </section>
  );
}

function VueltaEnCurso({ uid, vista, conductores }: { uid: string; vista: VistaVuelta; conductores: ConductorCache[] }) {
  const { vuelta, ida, regreso } = vista;
  const [abierta, setAbierta] = useState<{ sentido: Sentido; terminal: CodigoTerminal } | null>(null);

  async function salir(sentido: Sentido) {
    await iniciarTrayecto(baseLocal(), vuelta.id, sentido);
    refrescar();
  }

  async function finalizar() {
    const aviso = vista.terminalesPendientes
      ? `Quedan ${vista.terminalesPendientes} terminal(es) sin registrar. ¿Finalizar de todas formas?`
      : "¿Finalizar la vuelta? Después solo el administrador la puede cerrar.";
    if (!window.confirm(aviso)) return;
    await finalizarVuelta(baseLocal(), vuelta.id);
    refrescar();
  }

  const trayectoCard = (sentido: Sentido, t: TrayectoVista | null) => {
    const origen = sentido === "ida" ? "Florencia" : "Cali";
    if (!t) {
      const bloqueado = sentido === "regreso" && (!ida || vuelta.tipo === "varada");
      return (
        <button key={sentido} className={boton} disabled={bloqueado} onClick={() => salir(sentido)}>
          {sentido === "ida" ? "Salir de Florencia (ida)" : "Salir de Cali (regreso)"}
        </button>
      );
    }
    return (
      <section key={sentido} className={tarjeta}>
        <header className="flex items-baseline justify-between">
          <h2 className="font-semibold">{sentido === "ida" ? "Ida" : "Regreso"} · desde {origen}</h2>
          <span className="text-xs text-texto-suave">{t.trayecto.fecha}</span>
        </header>
        {t.trayecto.terminal_fin && (
          <p className="text-sm text-aviso">Se varó en {TERMINALES[t.trayecto.terminal_fin]}</p>
        )}
        <ul className="flex flex-col gap-2">
          {t.terminales.map((term) =>
            abierta?.sentido === sentido && abierta.terminal === term.codigo ? (
              <li key={term.codigo}>
                <FormularioPlanilla uid={uid} trayecto={t.trayecto} terminal={term} alTerminar={() => setAbierta(null)} />
              </li>
            ) : (
              <li key={term.codigo}>
                <FilaTerminal terminal={term} alAbrir={() => setAbierta({ sentido, terminal: term.codigo })} />
              </li>
            ),
          )}
        </ul>
        <PolillaDelTrayecto trayecto={t} />
        {!t.trayecto.terminal_fin && <Varada vista={vista} trayecto={t} />}
      </section>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Vuelta en curso</h1>
        <p className="text-sm text-texto-suave">
          Desde el {vuelta.fecha_inicio} · Florencia: {nombreDe(conductores, vuelta.conductor_florencia_id)} · Pitalito:{" "}
          {nombreDe(conductores, vuelta.conductor_pitalito_id)}
        </p>
        {vuelta.tipo === "varada" && <p className="text-sm text-aviso">Vuelta varada</p>}
        {vista.sinEnviar && <p className="text-xs text-aviso">Hay cambios guardados en el celular sin enviar</p>}
      </section>
      {trayectoCard("ida", ida)}
      {trayectoCard("regreso", regreso)}
      <button className={botonSecundario} onClick={finalizar}>Finalizar vuelta</button>
    </div>
  );
}

function FilaTerminal({ terminal, alAbrir }: { terminal: TerminalVista; alAbrir: () => void }) {
  const detalle =
    terminal.estado === "registrada"
      ? `Neto ${formatearPesos(terminal.planilla?.neto ?? 0)}` // registro individual, no un total
      : terminal.estado === "sin_planilla"
        ? `Sin planilla: ${terminal.planilla?.motivo_sin_planilla ?? ""}`
        : "Falta registrar";
  return (
    <button onClick={alAbrir} className="flex w-full items-center justify-between rounded-xl border border-borde px-4 py-3 text-left">
      <span className="flex flex-col">
        <span className="font-medium">{TERMINALES[terminal.codigo]}</span>
        <span className={`monto text-sm ${terminal.estado === "pendiente" ? "text-aviso" : "text-texto-suave"}`}>{detalle}</span>
      </span>
      <span className="text-xs text-texto-suave">{terminal.sinEnviar ? "Sin enviar" : terminal.estado === "pendiente" ? "Registrar" : "Corregir"}</span>
    </button>
  );
}

function Varada({ vista, trayecto }: { vista: VistaVuelta; trayecto: TrayectoVista }) {
  const [abierto, setAbierto] = useState(false);
  // Puede quedarse en cualquier terminal intermedia del trayecto.
  const opciones = tramosDe(trayecto.trayecto.sentido).slice(0, -1).map((t) => t.destino);

  if (!abierto) {
    return <button className="text-left text-sm text-texto-suave underline" onClick={() => setAbierto(true)}>¿Se varó la buseta?</button>;
  }
  async function marcar(terminal: CodigoTerminal) {
    if (!window.confirm(`¿Marcar la vuelta como varada en ${TERMINALES[terminal]}? Quedará toda en $0.`)) return;
    await marcarVarada(baseLocal(), vista.vuelta, trayecto.trayecto, terminal);
    refrescar();
  }
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm">¿Dónde se quedó?</span>
      {opciones.map((t) => (
        <button key={t} className={botonSecundario} onClick={() => marcar(t)}>{TERMINALES[t]}</button>
      ))}
      <button className="text-sm text-texto-suave underline" onClick={() => setAbierto(false)}>Cancelar</button>
    </div>
  );
}
