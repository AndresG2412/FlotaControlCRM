"use client";

import { useState, useTransition } from "react";
import { leerPesos } from "@/lib/dominio/dinero";
import { hoyEnBogota } from "@/lib/dominio/fechas";
import { comprimirImagen, MAX_BYTES_FOTO } from "@/lib/offline/fotos";
import { clienteNavegador } from "@/lib/supabase/navegador";
import { anularPago, registrarPago, type Resultado } from "./acciones";

// Diseño provisional: la presentación final la define la sección de diseño.
const campo = "h-10 w-full rounded-xl border border-borde bg-superficie px-3 text-sm";
const boton = "h-10 rounded-xl bg-marca px-4 text-sm font-semibold text-marca-texto disabled:opacity-60";
const botonSecundario = "h-10 rounded-xl border border-borde px-4 text-sm disabled:opacity-60";

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
        setError(e instanceof Error && e.message ? e.message : "No se pudo completar. Revisa la conexión.");
      }
    });
  return { pendiente, error, ejecutar };
}

/** Sube el comprobante comprimido a la carpeta del admin en el bucket privado. */
async function subirComprobante(uid: string, archivo: File): Promise<string> {
  const blob = await comprimirImagen(archivo);
  if (blob.size > MAX_BYTES_FOTO) throw new Error("La foto pesa más de 5 MB");
  const extension = blob.type === "image/png" ? "png" : blob.type === "image/jpeg" ? "jpg" : "webp";
  const ruta = `${uid}/${crypto.randomUUID()}.${extension}`;
  const { error } = await clienteNavegador().storage.from("evidencias").upload(ruta, blob, { contentType: blob.type });
  if (error) throw new Error("No se pudo subir la foto del comprobante");
  return ruta;
}

/** Registrar un pago nuevo; con `renovar`, prellenado para renovar ese concepto. */
export function FormularioPago({ uid, conceptos, renovar }: { uid: string; conceptos: string[]; renovar?: string }) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState(renovar ?? "");
  const [fechaPago, setFechaPago] = useState(hoyEnBogota());
  const [costo, setCosto] = useState("");
  const [recordatorio, setRecordatorio] = useState("");
  const [vencimiento, setVencimiento] = useState("");
  const [notas, setNotas] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const { pendiente, error, ejecutar } = useAccion();

  if (!abierto) {
    return renovar ? (
      <button className={`${botonSecundario} w-fit`} onClick={() => setAbierto(true)}>Registrar renovación</button>
    ) : (
      <button className={`${boton} w-fit`} onClick={() => setAbierto(true)}>+ Registrar pago</button>
    );
  }

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    setAviso(null);
    const valor = leerPesos(costo);
    if (valor === null) return setAviso("Escribe el costo en pesos, sin decimales");
    ejecutar(async () => {
      const comprobante_path = foto ? await subirComprobante(uid, foto) : null;
      return registrarPago({
        nombre,
        fecha_pago: fechaPago,
        costo: valor,
        fecha_recordatorio: recordatorio || null,
        fecha_vencimiento: vencimiento || null,
        notas: notas || null,
        comprobante_path,
      });
    }, () => setAbierto(false));
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-2 rounded-2xl border border-borde bg-superficie p-4">
      <h2 className="font-semibold">{renovar ? `Renovar ${renovar}` : "Registrar pago"}</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          ¿Qué se pagó?
          <input className={campo} list="conceptos-pago" value={nombre} maxLength={120} required onChange={(e) => setNombre(e.target.value)} placeholder="SOAT, seguro, tecnomecánica…" />
          <datalist id="conceptos-pago">
            {conceptos.map((c) => <option key={c} value={c} />)}
          </datalist>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Costo
          <input className={campo} inputMode="numeric" value={costo} required onChange={(e) => setCosto(e.target.value)} placeholder="1.200.000" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Fecha de pago
          <input type="date" className={campo} value={fechaPago} required onChange={(e) => setFechaPago(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Vence (opcional)
          <input type="date" className={campo} value={vencimiento} onChange={(e) => setVencimiento(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Recordarme el (opcional, llega un correo)
          <input type="date" className={campo} value={recordatorio} onChange={(e) => setRecordatorio(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Foto del comprobante (opcional)
          <input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          Notas (opcional)
          <input className={campo} value={notas} maxLength={1000} onChange={(e) => setNotas(e.target.value)} />
        </label>
      </div>
      {(aviso ?? error) && <p role="alert" className="text-sm text-perdida">{aviso ?? error}</p>}
      <div className="flex gap-2">
        <button type="button" className={botonSecundario} onClick={() => setAbierto(false)}>Cancelar</button>
        <button className={boton} disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar"}</button>
      </div>
    </form>
  );
}

export function EliminarPago({ id }: { id: string }) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const { pendiente, error, ejecutar } = useAccion();
  if (!abierto) {
    return <button className="w-fit text-xs text-perdida underline" onClick={() => setAbierto(true)}>Eliminar</button>;
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        ejecutar(() => anularPago({ id, motivo_anulacion: motivo.trim() }), () => setAbierto(false));
      }}
      className="flex flex-col gap-2 rounded-xl border border-perdida p-3"
    >
      <p className="text-sm">¿Seguro que quieres eliminar este pago? Queda anulado con el motivo.</p>
      <input className={campo} value={motivo} maxLength={300} required onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo" />
      {error && <p role="alert" className="text-sm text-perdida">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className={botonSecundario} onClick={() => setAbierto(false)}>Cancelar</button>
        <button className="h-10 rounded-xl border border-perdida px-4 text-sm text-perdida" disabled={pendiente || !motivo.trim()}>Sí, eliminar</button>
      </div>
    </form>
  );
}
