"use client";

import { useState, useTransition } from "react";
import type { Persona, PlanillaDetalle } from "@/lib/admin/vueltas";
import { formatearPesos, leerPesos } from "@/lib/dominio/dinero";
import { diferenciaCuadre } from "@/lib/dominio/liquidacion";
import {
  destinosDeEncomienda,
  terminalDeFacturacion,
  type DestinoSobrante,
  type LugarEncomienda,
} from "@/lib/dominio/polilla";
import {
  destinosPosibles,
  TERMINALES,
  tramosDe,
  type CodigoTerminal,
  type Sentido,
} from "@/lib/dominio/ruta";
import type { TipoVuelta } from "@/lib/dominio/vuelta";
import { comprimirImagen, MAX_BYTES_FOTO } from "@/lib/offline/fotos";
import { clienteNavegador } from "@/lib/supabase/navegador";
import type { CodigoTramo } from "@/lib/validaciones/registros";
import {
  actualizarVuelta,
  ajustarGastoFijo,
  anularEncomienda,
  anularGasto,
  anularPasajero,
  anularPlanilla,
  cerrarVuelta,
  corregirPlanilla,
  guardarEncomiendaAdmin,
  guardarGastoAdmin,
  guardarPasajeroAdmin,
  iniciarTrayectoAdmin,
  reabrirVuelta,
  reabrirVueltaCerrada,
  registrarPlanillaAdmin,
  type Resultado,
} from "../acciones";

// Diseño provisional: la presentación final la define la sección de diseño.
const campo = "h-10 w-full neu-campo px-3 text-sm";
const boton = "h-10 neu-boton-marca px-4 text-sm";
const botonSecundario = "h-10 neu-boton px-4 text-sm";
const botonPeligro = "h-10 w-fit neu-boton px-4 text-sm text-perdida";

/** Sube una foto de evidencia comprimida a la carpeta del admin en el bucket privado evidencias. */
async function subirFoto(uid: string, archivo: File): Promise<string> {
  const blob = await comprimirImagen(archivo);
  if (blob.size > MAX_BYTES_FOTO) throw new Error("La foto pesa más de 5 MB");
  const extension = blob.type === "image/png" ? "png" : blob.type === "image/jpeg" ? "jpg" : "webp";
  const ruta = `${uid}/${crypto.randomUUID()}.${extension}`;
  const { error } = await clienteNavegador().storage.from("evidencias").upload(ruta, blob, { contentType: blob.type });
  if (error) throw new Error("No se pudo subir la foto");
  return ruta;
}

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
      } catch (e) {
        setError(e instanceof Error && e.message ? e.message : "No se pudo completar. Revisa la conexión e intenta de nuevo.");
      }
    });
  return { pendiente, error, ejecutar };
}

function MensajeError({ mensaje }: { mensaje: string | null }) {
  return mensaje ? <p role="alert" className="text-sm text-perdida">{mensaje}</p> : null;
}

export function AccionesPlanilla({ planilla, uid }: { planilla: PlanillaDetalle; uid: string }) {
  const [modo, setModo] = useState<"nada" | "corregir" | "eliminar">("nada");

  if (modo === "corregir") return <CorregirPlanilla planilla={planilla} uid={uid} alTerminar={() => setModo("nada")} />;
  if (modo === "eliminar") return <EliminarPlanilla planilla={planilla} alTerminar={() => setModo("nada")} />;
  return (
    <div className="flex gap-2">
      <button type="button" className={botonSecundario} onClick={() => setModo("corregir")}>Corregir</button>
      <button type="button" className={botonPeligro} onClick={() => setModo("eliminar")}>Eliminar</button>
    </div>
  );
}

function CorregirPlanilla({ planilla: p, uid, alTerminar }: { planilla: PlanillaDetalle; uid: string; alTerminar: () => void }) {
  const [emitida, setEmitida] = useState(p.emitida);
  const [neto, setNeto] = useState(p.neto != null ? String(p.neto) : "");
  const [numero, setNumero] = useState(p.numero ?? "");
  const [pasajeros, setPasajeros] = useState(p.pasajeros != null ? String(p.pasajeros) : "");
  const [motivo, setMotivo] = useState(p.motivo_sin_planilla ?? "");
  const [foto, setFoto] = useState<File | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const { pendiente, error, ejecutar } = useAccion();
  const montoLeido = leerPesos(neto);

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    setAviso(null);
    if (emitida && montoLeido === null) return setAviso("Escribe el neto a pagar, sin decimales");
    ejecutar(
      async () => {
        let foto_path: string | undefined = undefined;
        if (foto) {
          foto_path = await subirFoto(uid, foto);
        }
        return corregirPlanilla({
          id: p.id,
          emitida,
          neto: emitida ? montoLeido : null,
          numero: emitida ? numero.trim() || null : null,
          pasajeros: emitida && pasajeros ? Number(pasajeros) : null,
          motivo_sin_planilla: emitida ? null : motivo.trim() || null,
          ...(foto_path !== undefined ? { foto_path } : {}),
        });
      },
      alTerminar,
    );
  }

  return (
    <form onSubmit={guardar} className="mt-1 flex flex-col gap-2 neu-pozo p-3">
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1">
          <input type="radio" checked={emitida} onChange={() => setEmitida(true)} /> Hubo planilla
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" checked={!emitida} onChange={() => setEmitida(false)} /> No hubo
        </label>
      </div>
      {emitida ? (
        <div className="grid grid-cols-1 gap-3 @md:grid-cols-2">
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
          <label className="flex flex-col gap-1 text-sm">
            Foto (opcional)
            <input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
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
    <form onSubmit={eliminar} className="mt-1 flex flex-col gap-2 neu-pozo neu-peligro p-3">
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
    <form onSubmit={guardar} className="flex flex-col gap-2 neu-pozo p-3">
      <div className="grid grid-cols-1 gap-3 @md:grid-cols-3">
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
        <div className="flex flex-col gap-2 neu-pozo p-3">
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
    <form onSubmit={eliminar} className="mt-1 flex flex-col gap-2 neu-pozo neu-peligro p-3">
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

/** Ajusta el valor de un gasto fijo en esta vuelta. */
export function AjustarGastoFijo({ id, concepto, valor }: { id: string; concepto: string; valor: number }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState(String(valor));
  const [aviso, setAviso] = useState<string | null>(null);
  const { pendiente, error, ejecutar } = useAccion();

  if (!abierto) {
    return <button type="button" className="w-fit text-sm text-marca underline" onClick={() => setAbierto(true)}>Ajustar</button>;
  }

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    const monto = leerPesos(texto);
    if (monto === null) return setAviso("Escribe el valor sin decimales (0 si no aplicó)");
    setAviso(null);
    ejecutar(() => ajustarGastoFijo({ id, valor: monto }), () => setAbierto(false));
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-2 neu-pozo p-3">
      <label className="flex flex-col gap-1 text-sm">
        {concepto} en esta vuelta
        <input className={campo} inputMode="numeric" value={texto} onChange={(e) => setTexto(e.target.value)} />
      </label>
      <p className="text-xs text-aviso">
        Si luego cambias el tipo o la fecha de la vuelta, los gastos fijos se recargan desde la configuración y este ajuste se pierde.
      </p>
      <MensajeError mensaje={aviso ?? error} />
      <div className="flex gap-2">
        <button type="button" className={botonSecundario} onClick={() => setAbierto(false)}>Cancelar</button>
        <button type="submit" className={boton} disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  );
}

/** Eliminar (anular con motivo) un gasto variable. */
export function EliminarGasto({ id }: { id: string }) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const { pendiente, error, ejecutar } = useAccion();

  if (!abierto) {
    return <button type="button" className={botonPeligro} onClick={() => setAbierto(true)}>Eliminar</button>;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        ejecutar(() => anularGasto({ id, motivo_anulacion: motivo.trim() }), () => setAbierto(false));
      }}
      className="mt-1 flex flex-col gap-2 neu-pozo neu-peligro p-3"
    >
      <p className="text-sm font-medium">¿Seguro que quieres eliminar este gasto?</p>
      <p className="text-xs text-texto-suave">No se borra: queda anulado con el motivo y deja de restar en la vuelta.</p>
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

/** Cierra la vuelta: muestra el efectivo esperado y la diferencia antes de confirmar. */
export function CerrarVuelta({ id, efectivoEsperado }: { id: string; efectivoEsperado: number }) {
  const [entregado, setEntregado] = useState("");
  const [notas, setNotas] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const { pendiente, error, ejecutar } = useAccion();
  const monto = leerPesos(entregado);
  const diferencia = monto === null ? null : diferenciaCuadre(monto, efectivoEsperado);

  function revisar(e: React.FormEvent) {
    e.preventDefault();
    if (monto === null) return setAviso("Escribe el efectivo que entregó el conductor, sin decimales");
    setAviso(null);
    setConfirmando(true);
  }

  if (confirmando && monto !== null && diferencia !== null) {
    return (
      <div className="flex flex-col gap-2 neu-pozo p-3">
        <p className="text-sm font-medium">¿Cerrar la vuelta? Después queda solo de lectura.</p>
        <dl className="monto flex flex-col gap-1 text-sm">
          <div className="flex justify-between"><dt className="text-texto-suave">Efectivo esperado</dt><dd>{formatearPesos(efectivoEsperado)}</dd></div>
          <div className="flex justify-between"><dt className="text-texto-suave">Efectivo entregado</dt><dd>{formatearPesos(monto)}</dd></div>
          <div className="flex justify-between font-semibold">
            <dt>Diferencia</dt>
            <dd className={diferencia < 0 ? "text-perdida" : diferencia > 0 ? "text-aviso" : "text-ganancia"}>
              {diferencia < 0 ? `Faltan ${formatearPesos(-diferencia)}` : diferencia > 0 ? `Sobran ${formatearPesos(diferencia)}` : "Cuadra"}
            </dd>
          </div>
        </dl>
        <MensajeError mensaje={error} />
        <div className="flex gap-2">
          <button type="button" className={botonSecundario} onClick={() => setConfirmando(false)}>Volver</button>
          <button
            type="button"
            className={boton}
            disabled={pendiente}
            onClick={() => ejecutar(() => cerrarVuelta({ id, efectivo_entregado: monto, notas: notas.trim() || undefined }))}
          >
            {pendiente ? "Cerrando…" : "Sí, cerrar vuelta"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={revisar} className="flex flex-col gap-2 neu-pozo p-3">
      <h3 className="font-semibold">Cerrar vuelta</h3>
      <label className="flex flex-col gap-1 text-sm">
        Efectivo que entregó el conductor
        <input className={campo} inputMode="numeric" value={entregado} onChange={(e) => setEntregado(e.target.value)} placeholder="1.200.000" />
        {monto !== null && <span className="monto text-xs text-texto-suave">{formatearPesos(monto)}</span>}
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Notas (opcional)
        <input className={campo} value={notas} maxLength={1000} onChange={(e) => setNotas(e.target.value)} />
      </label>
      <MensajeError mensaje={aviso} />
      <button type="submit" className={`${boton} w-fit`}>Revisar cuadre</button>
    </form>
  );
}

/** Reabrir una vuelta cerrada: pide motivo; el cuadre anterior queda en el historial. */
export function ReabrirCerrada({ id }: { id: string }) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const { pendiente, error, ejecutar } = useAccion();

  if (!abierto) {
    return <button type="button" className={`${botonSecundario} w-fit`} onClick={() => setAbierto(true)}>Reabrir vuelta cerrada</button>;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        ejecutar(() => reabrirVueltaCerrada({ id, motivo: motivo.trim() }), () => setAbierto(false));
      }}
      className="flex flex-col gap-2 neu-pozo neu-peligro p-3"
    >
      <p className="text-sm font-medium">¿Seguro que quieres reabrir esta vuelta cerrada?</p>
      <p className="text-xs text-texto-suave">Queda finalizada y el cuadre actual se guarda en el historial; habrá que cerrarla de nuevo.</p>
      <label className="flex flex-col gap-1 text-sm">
        Motivo
        <input className={campo} value={motivo} minLength={3} maxLength={300} required onChange={(e) => setMotivo(e.target.value)} placeholder="Error en un gasto…" />
      </label>
      <MensajeError mensaje={error} />
      <div className="flex gap-2">
        <button type="button" className={botonSecundario} onClick={() => setAbierto(false)}>Cancelar</button>
        <button type="submit" className={botonPeligro} disabled={pendiente || motivo.trim().length < 3}>
          {pendiente ? "Reabriendo…" : "Sí, reabrir"}
        </button>
      </div>
    </form>
  );
}

/** Iniciar ida o regreso en una vuelta. */
export function IniciarTrayecto({ vueltaId, sentido }: { vueltaId: string; sentido: Sentido }) {
  const { pendiente, error, ejecutar } = useAccion();
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        className={`${boton} w-fit`}
        disabled={pendiente}
        onClick={() => ejecutar(() => iniciarTrayectoAdmin({ vuelta_id: vueltaId, sentido }))}
      >
        {pendiente ? "Iniciando…" : sentido === "ida" ? "Iniciar ida (Florencia → Cali)" : "Iniciar regreso (Cali → Florencia)"}
      </button>
      <MensajeError mensaje={error} />
    </div>
  );
}

/** Formulario para que el admin registre una planilla desde cero en una terminal pendiente. */
export function RegistrarPlanilla({
  uid,
  trayectoId,
  terminal,
  sentido: _sentido,
}: {
  uid: string;
  trayectoId: string;
  terminal: CodigoTerminal;
  sentido: Sentido;
}) {
  const [abierto, setAbierto] = useState(false);
  const [emitida, setEmitida] = useState(true);
  const [neto, setNeto] = useState("");
  const [numero, setNumero] = useState("");
  const [pasajeros, setPasajeros] = useState("");
  const [motivo, setMotivo] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const { pendiente, error, ejecutar } = useAccion();
  const montoLeido = leerPesos(neto);

  if (!abierto) {
    return (
      <button type="button" className={`${boton} w-fit mt-1`} onClick={() => setAbierto(true)}>
        + Registrar planilla
      </button>
    );
  }

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    setAviso(null);
    if (emitida && montoLeido === null) return setAviso("Escribe el neto a pagar, sin decimales");
    if (!emitida && !motivo.trim()) return setAviso("Indica el motivo de por qué no hubo planilla");

    ejecutar(
      async () => {
        let foto_path: string | null = null;
        if (foto) {
          foto_path = await subirFoto(uid, foto);
        }
        return registrarPlanillaAdmin({
          trayecto_id: trayectoId,
          terminal,
          emitida,
          neto: emitida ? montoLeido : null,
          numero: emitida && numero.trim() ? numero.trim() : null,
          pasajeros: emitida && pasajeros ? Number(pasajeros) : null,
          motivo_sin_planilla: emitida ? null : motivo.trim(),
          foto_path,
        });
      },
      () => setAbierto(false),
    );
  }

  return (
    <form onSubmit={guardar} className="mt-2 flex flex-col gap-2 neu-pozo p-3">
      <h4 className="font-semibold text-sm">Registrar planilla de {TERMINALES[terminal]}</h4>
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="radio" checked={emitida} onChange={() => setEmitida(true)} /> Hubo planilla
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="radio" checked={!emitida} onChange={() => setEmitida(false)} /> No hubo
        </label>
      </div>
      {emitida ? (
        <div className="grid grid-cols-1 gap-3 @md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Neto a pagar
            <input className={campo} inputMode="numeric" value={neto} onChange={(e) => setNeto(e.target.value)} placeholder="600.000" autoFocus />
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
          <label className="flex flex-col gap-1 text-sm">
            Foto (opcional)
            <input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
          </label>
        </div>
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          ¿Por qué no hubo planilla?
          <input className={campo} value={motivo} maxLength={300} onChange={(e) => setMotivo(e.target.value)} placeholder="Terminal cerrada, no se vendió..." autoFocus />
        </label>
      )}
      <MensajeError mensaje={aviso ?? error} />
      <div className="flex gap-2">
        <button type="button" className={botonSecundario} onClick={() => setAbierto(false)}>Cancelar</button>
        <button type="submit" className={boton} disabled={pendiente}>
          {pendiente ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}

/** Controles para registrar pasajeros de vía y encomiendas en el trayecto. */
export function PolillaAdminControles({
  trayectoId,
  sentido,
}: {
  trayectoId: string;
  sentido: Sentido;
}) {
  const [modo, setModo] = useState<"nada" | "pasajero" | "encomienda">("nada");

  return (
    <div className="flex flex-col gap-2">
      {modo === "nada" && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={`${boton} w-fit`} onClick={() => setModo("pasajero")}>
            + Pasajero de vía
          </button>
          <button type="button" className={`${botonSecundario} w-fit`} onClick={() => setModo("encomienda")}>
            + Encomienda
          </button>
        </div>
      )}
      {modo === "pasajero" && (
        <FormularioPasajeroAdmin trayectoId={trayectoId} sentido={sentido} alTerminar={() => setModo("nada")} />
      )}
      {modo === "encomienda" && (
        <FormularioEncomiendaAdmin trayectoId={trayectoId} sentido={sentido} alTerminar={() => setModo("nada")} />
      )}
    </div>
  );
}

function FormularioPasajeroAdmin({
  trayectoId,
  sentido,
  alTerminar,
}: {
  trayectoId: string;
  sentido: Sentido;
  alTerminar: () => void;
}) {
  const tramos = tramosDe(sentido);
  const [tramo, setTramo] = useState<string>(tramos[0]?.id ?? "ida-1");
  const destinos = destinosPosibles(tramo);
  const [destino, setDestino] = useState<CodigoTerminal>(destinos[destinos.length - 1] ?? "cali");
  const [cobrado, setCobrado] = useState("");
  const [facturado, setFacturado] = useState("");
  const [destinoSobrante, setDestinoSobrante] = useState<DestinoSobrante>("polilla");
  const [aviso, setAviso] = useState<string | null>(null);
  const { pendiente, error, ejecutar } = useAccion();

  const terminalFact = terminalDeFacturacion(tramo, destino);
  const montoCobrado = leerPesos(cobrado);
  const montoFacturado = terminalFact ? leerPesos(facturado) : 0;

  function alCambiarTramo(nuevo: string) {
    setTramo(nuevo);
    const nuevosDestinos = destinosPosibles(nuevo);
    if (!nuevosDestinos.includes(destino)) {
      setDestino(nuevosDestinos[nuevosDestinos.length - 1]);
    }
  }

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    setAviso(null);
    if (montoCobrado === null || montoCobrado < 1) return setAviso("Escribe cuánto pagó el pasajero, sin decimales");
    if (terminalFact && (montoFacturado === null || montoFacturado < 1)) {
      return setAviso(`Escribe cuánto se pagó en taquilla al pasar por ${TERMINALES[terminalFact]}`);
    }
    if (terminalFact && montoFacturado !== null && montoFacturado > montoCobrado) {
      return setAviso("Lo facturado no puede superar lo cobrado");
    }

    ejecutar(
      () =>
        guardarPasajeroAdmin({
          trayecto_id: trayectoId,
          tramo_id: tramo as CodigoTramo,
          destino,
          monto_cobrado: montoCobrado,
          facturado: terminalFact !== null,
          terminal_facturacion: terminalFact,
          monto_facturado: montoFacturado ?? 0,
          destino_sobrante: destinoSobrante,
        }),
      alTerminar,
    );
  }

  const sobrante = montoCobrado !== null && montoFacturado !== null ? montoCobrado - montoFacturado : null;

  return (
    <form onSubmit={guardar} className="mt-2 flex flex-col gap-2 neu-pozo p-3">
      <h4 className="font-semibold text-sm">Registrar pasajero de vía</h4>
      <div className="grid grid-cols-1 gap-3 @md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          ¿Dónde subió?
          <select className={campo} value={tramo} onChange={(e) => alCambiarTramo(e.target.value)}>
            {tramos.map((t) => (
              <option key={t.id} value={t.id}>{TERMINALES[t.origen]} → {TERMINALES[t.destino]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          ¿A dónde va?
          <select className={campo} value={destino} onChange={(e) => setDestino(e.target.value as CodigoTerminal)}>
            {destinos.map((d) => (
              <option key={d} value={d}>{TERMINALES[d]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Cobró al pasajero
          <input className={campo} inputMode="numeric" value={cobrado} onChange={(e) => setCobrado(e.target.value)} placeholder="40.000" />
          {montoCobrado !== null && <span className="monto text-xs text-texto-suave">{formatearPesos(montoCobrado)}</span>}
        </label>
        {terminalFact && (
          <label className="flex flex-col gap-1 text-sm">
            Facturó en {TERMINALES[terminalFact]}
            <input className={campo} inputMode="numeric" value={facturado} onChange={(e) => setFacturado(e.target.value)} placeholder="25.000" />
            {montoFacturado !== null && <span className="monto text-xs text-texto-suave">{formatearPesos(montoFacturado)}</span>}
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm">
          Destino del sobrante
          <select className={campo} value={destinoSobrante} onChange={(e) => setDestinoSobrante(e.target.value as DestinoSobrante)}>
            <option value="polilla">A la caja de la vuelta</option>
            <option value="conductor">Se lo quedó el conductor</option>
          </select>
        </label>
      </div>
      {sobrante !== null && (
        <p className="monto text-xs text-texto-suave">
          Sobran {formatearPesos(sobrante)} {destinoSobrante === "polilla" ? "para la caja" : "para el conductor"}
        </p>
      )}
      <MensajeError mensaje={aviso ?? error} />
      <div className="flex gap-2">
        <button type="button" className={botonSecundario} onClick={alTerminar}>Cancelar</button>
        <button type="submit" className={boton} disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar pasajero"}</button>
      </div>
    </form>
  );
}

function FormularioEncomiendaAdmin({
  trayectoId,
  sentido,
  alTerminar,
}: {
  trayectoId: string;
  sentido: Sentido;
  alTerminar: () => void;
}) {
  const tramos = tramosDe(sentido);
  const [tipoOrigen, setTipoOrigen] = useState<"terminal" | "via">("terminal");
  const [terminalOrigen, setTerminalOrigen] = useState<CodigoTerminal>(tramos[0]?.origen ?? "florencia");
  const [tramoOrigen, setTramoOrigen] = useState<string>(tramos[0]?.id ?? "ida-1");

  const lugar: LugarEncomienda = tipoOrigen === "terminal" ? { terminal: terminalOrigen } : { tramo: tramoOrigen };
  const destinos = destinosDeEncomienda(sentido, lugar);
  const [destino, setDestino] = useState<CodigoTerminal>(destinos[destinos.length - 1] ?? "cali");
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const { pendiente, error, ejecutar } = useAccion();
  const montoLeido = leerPesos(monto);

  const destinoValido = destinos.includes(destino) ? destino : destinos[destinos.length - 1];

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    setAviso(null);
    if (montoLeido === null || montoLeido < 1) return setAviso("Escribe cuánto se cobró por la encomienda, sin decimales");
    if (!destinoValido) return setAviso("Elige un destino válido");

    ejecutar(
      () =>
        guardarEncomiendaAdmin({
          trayecto_id: trayectoId,
          recibida_en_terminal: tipoOrigen === "terminal" ? terminalOrigen : null,
          recibida_en_tramo: tipoOrigen === "via" ? (tramoOrigen as CodigoTramo) : null,
          destino: destinoValido,
          descripcion: descripcion.trim() || null,
          monto: montoLeido,
        }),
      alTerminar,
    );
  }

  return (
    <form onSubmit={guardar} className="mt-2 flex flex-col gap-2 neu-pozo p-3">
      <h4 className="font-semibold text-sm">Registrar encomienda</h4>
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="radio" checked={tipoOrigen === "terminal"} onChange={() => setTipoOrigen("terminal")} /> En terminal
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="radio" checked={tipoOrigen === "via"} onChange={() => setTipoOrigen("via")} /> En la vía
        </label>
      </div>
      <div className="grid grid-cols-1 gap-3 @md:grid-cols-2">
        {tipoOrigen === "terminal" ? (
          <label className="flex flex-col gap-1 text-sm">
            Terminal de recepción
            <select className={campo} value={terminalOrigen} onChange={(e) => setTerminalOrigen(e.target.value as CodigoTerminal)}>
              {tramos.map((t) => (
                <option key={t.origen} value={t.origen}>{TERMINALES[t.origen]}</option>
              ))}
            </select>
          </label>
        ) : (
          <label className="flex flex-col gap-1 text-sm">
            Tramo de recepción
            <select className={campo} value={tramoOrigen} onChange={(e) => setTramoOrigen(e.target.value)}>
              {tramos.map((t) => (
                <option key={t.id} value={t.id}>{TERMINALES[t.origen]} → {TERMINALES[t.destino]}</option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm">
          Destino
          <select className={campo} value={destinoValido} onChange={(e) => setDestino(e.target.value as CodigoTerminal)}>
            {destinos.map((d) => (
              <option key={d} value={d}>{TERMINALES[d]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Monto cobrado
          <input className={campo} inputMode="numeric" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="20.000" />
          {montoLeido !== null && <span className="monto text-xs text-texto-suave">{formatearPesos(montoLeido)}</span>}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Descripción (opcional)
          <input className={campo} value={descripcion} maxLength={200} onChange={(e) => setDescripcion(e.target.value)} placeholder="Caja repuestos, sobre..." />
        </label>
      </div>
      <MensajeError mensaje={aviso ?? error} />
      <div className="flex gap-2">
        <button type="button" className={botonSecundario} onClick={alTerminar}>Cancelar</button>
        <button type="submit" className={boton} disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar encomienda"}</button>
      </div>
    </form>
  );
}

const ETIQUETAS_GASTO = {
  acpm: "ACPM",
  liga: "Liga",
  extra: "Otro gasto",
  arreglo: "Arreglo en ruta",
} as const;

type TipoGasto = keyof typeof ETIQUETAS_GASTO;

/** Controles para registrar gastos variables en la vuelta. */
export function GastosVariablesAdminControles({
  uid,
  vueltaId,
  trayectoId,
}: {
  uid: string;
  vueltaId: string;
  trayectoId: string | null;
}) {
  const [tipoAbierto, setTipoAbierto] = useState<TipoGasto | null>(null);

  return (
    <div className="flex flex-col gap-2">
      {tipoAbierto === null ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={`${boton} w-fit`} onClick={() => setTipoAbierto("acpm")}>
            + ACPM
          </button>
          <button type="button" className={`${botonSecundario} w-fit`} onClick={() => setTipoAbierto("liga")}>
            + Liga
          </button>
          <button type="button" className={`${botonSecundario} w-fit`} onClick={() => setTipoAbierto("extra")}>
            + Otro gasto
          </button>
          <button type="button" className={`${botonSecundario} w-fit`} onClick={() => setTipoAbierto("arreglo")}>
            + Arreglo en ruta
          </button>
        </div>
      ) : (
        <FormularioGastoAdmin
          uid={uid}
          vueltaId={vueltaId}
          trayectoId={trayectoId}
          tipo={tipoAbierto}
          alTerminar={() => setTipoAbierto(null)}
        />
      )}
    </div>
  );
}

function FormularioGastoAdmin({
  uid,
  vueltaId,
  trayectoId,
  tipo,
  alTerminar,
}: {
  uid: string;
  vueltaId: string;
  trayectoId: string | null;
  tipo: TipoGasto;
  alTerminar: () => void;
}) {
  const [monto, setMonto] = useState("");
  const [terminal, setTerminal] = useState<CodigoTerminal>("florencia");
  const [galones, setGalones] = useState("");
  const [lugar, setLugar] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const { pendiente, error, ejecutar } = useAccion();
  const montoLeido = leerPesos(monto);

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    setAviso(null);
    if (montoLeido === null || montoLeido < 1) return setAviso("Escribe cuánto fue, sin decimales");
    if ((tipo === "extra" || tipo === "arreglo") && !descripcion.trim()) {
      return setAviso("Describe el gasto");
    }

    ejecutar(
      async () => {
        let foto_path: string | null = null;
        if (foto) {
          foto_path = await subirFoto(uid, foto);
        }
        return guardarGastoAdmin({
          vuelta_id: vueltaId,
          trayecto_id: trayectoId,
          tipo,
          monto: montoLeido,
          terminal: tipo === "liga" ? terminal : null,
          galones: tipo === "acpm" && galones ? Number(galones) : null,
          lugar: lugar.trim() || null,
          descripcion: descripcion.trim() || null,
          foto_path,
        });
      },
      alTerminar,
    );
  }

  return (
    <form onSubmit={guardar} className="mt-2 flex flex-col gap-2 neu-pozo p-3">
      <h4 className="font-semibold text-sm">Registrar {ETIQUETAS_GASTO[tipo]}</h4>
      <div className="grid grid-cols-1 gap-3 @md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Monto
          <input className={campo} inputMode="numeric" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="50.000" autoFocus />
          {montoLeido !== null && <span className="monto text-xs text-texto-suave">{formatearPesos(montoLeido)}</span>}
        </label>
        {tipo === "liga" && (
          <label className="flex flex-col gap-1 text-sm">
            Terminal
            <select className={campo} value={terminal} onChange={(e) => setTerminal(e.target.value as CodigoTerminal)}>
              <option value="florencia">Florencia</option>
              <option value="pitalito">Pitalito</option>
              <option value="popayan">Popayán</option>
              <option value="cali">Cali</option>
            </select>
          </label>
        )}
        {tipo === "acpm" && (
          <>
            <label className="flex flex-col gap-1 text-sm">
              Galones (opcional)
              <input className={campo} inputMode="decimal" value={galones} onChange={(e) => setGalones(e.target.value)} placeholder="15" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Lugar / Estación (opcional)
              <input className={campo} value={lugar} maxLength={120} onChange={(e) => setLugar(e.target.value)} placeholder="Terpel Pitalito" />
            </label>
          </>
        )}
        {(tipo === "extra" || tipo === "arreglo") && (
          <label className="flex flex-col gap-1 text-sm @md:col-span-2">
            Descripción
            <input className={campo} value={descripcion} maxLength={200} required onChange={(e) => setDescripcion(e.target.value)} placeholder="Despinche, bombillo, peaje extra..." />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm">
          Foto del recibo (opcional)
          <input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
        </label>
      </div>
      <MensajeError mensaje={aviso ?? error} />
      <div className="flex gap-2">
        <button type="button" className={botonSecundario} onClick={alTerminar}>Cancelar</button>
        <button type="submit" className={boton} disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar gasto"}</button>
      </div>
    </form>
  );
}
