"use client";

import { useState, useTransition } from "react";
import { leerPesos } from "@/lib/dominio/dinero";
import { guardarGastoFijoConfig } from "./acciones";

// Diseño provisional: la presentación final la define la sección de diseño.
const campo = "h-10 w-full rounded-xl border border-borde bg-superficie px-3 text-sm";
const boton = "h-10 rounded-xl bg-marca px-4 text-sm font-semibold text-marca-texto disabled:opacity-60";

/**
 * Cambia el valor de un concepto desde una fecha, agrega uno nuevo o lo quita
 * (valor 0). `conceptos` son los que ya existen, para elegirlos o escribir uno nuevo.
 */
export function FormularioGastoFijo({ conceptos, hoy }: { conceptos: string[]; hoy: string }) {
  const [concepto, setConcepto] = useState("");
  const [valor, setValor] = useState("");
  const [enRuta, setEnRuta] = useState(true);
  const [desde, setDesde] = useState(hoy);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pendiente, iniciar] = useTransition();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    const monto = leerPesos(valor);
    if (monto === null) return setError("Escribe el valor sin decimales (0 para quitar el concepto)");
    iniciar(async () => {
      try {
        const r = await guardarGastoFijoConfig({ concepto, valor: monto, se_paga_en_ruta: enRuta, vigente_desde: desde });
        if (r.error) return setError(r.error);
        setOk(true);
        setValor("");
      } catch {
        setError("No se pudo guardar. Revisa la conexión e intenta de nuevo.");
      }
    });
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3 rounded-2xl border border-borde bg-superficie p-4">
      <h2 className="font-semibold">Cambiar, agregar o quitar un gasto fijo</h2>
      <label className="flex flex-col gap-1 text-sm">
        Concepto
        <input className={campo} list="conceptos-fijos" value={concepto} maxLength={80} onChange={(e) => setConcepto(e.target.value)} placeholder="Peajes" required />
        <datalist id="conceptos-fijos">{conceptos.map((c) => <option key={c} value={c} />)}</datalist>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Valor por vuelta (0 = quitar el concepto)
        <input className={campo} inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="35.000" required />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Vigente desde
        <input className={campo} type="date" value={desde} onChange={(e) => setDesde(e.target.value)} required />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enRuta} onChange={(e) => setEnRuta(e.target.checked)} />
        Lo paga el conductor en ruta (sale del efectivo de la vuelta)
      </label>
      {error && <p role="alert" className="text-sm text-perdida">{error}</p>}
      {ok && <p className="text-sm text-ganancia">Guardado.</p>}
      <button type="submit" className={boton} disabled={pendiente}>Guardar</button>
    </form>
  );
}
