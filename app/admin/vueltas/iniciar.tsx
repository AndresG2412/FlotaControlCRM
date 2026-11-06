"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Persona } from "@/lib/admin/vueltas";
import { iniciarVueltaAdmin } from "./acciones";
import { FinalizarVuelta } from "./finalizar";

// Diseño provisional: la presentación final la define la sección de diseño.

/** El admin inicia la vuelta de hoy a nombre de un conductor. Solo una en curso. */
export function IniciarVuelta({
  conductores,
  enCurso,
}: {
  conductores: Persona[];
  enCurso: { id: string; fecha: string } | null;
}) {
  const router = useRouter();
  const [conductorId, setConductorId] = useState(conductores.length === 1 ? conductores[0].id : "");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  if (enCurso) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 neu-tarjeta p-4">
        <p className="text-sm">Hay una vuelta en curso desde el {enCurso.fecha}. Hay que finalizarla para iniciar otra.</p>
        <div className="flex flex-wrap items-start gap-2">
          <Link href={`/admin/vueltas/${enCurso.id}`} className="h-10 neu-boton px-4 text-sm content-center">Ver vuelta en curso</Link>
          <FinalizarVuelta id={enCurso.id} />
        </div>
      </div>
    );
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!conductorId) return setError("Elige el conductor");
    setError(null);
    iniciar(async () => {
      try {
        const r = await iniciarVueltaAdmin({ conductor_id: conductorId });
        if (r.error) return setError(r.error);
        if (r.id) router.push(`/admin/vueltas/${r.id}`);
      } catch {
        setError("No se pudo completar. Revisa la conexión e intenta de nuevo.");
      }
    });
  }

  return (
    <form onSubmit={enviar} className="flex flex-wrap items-end gap-3 neu-tarjeta p-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold">Iniciar vuelta</h2>
        <p className="text-xs text-texto-suave">Queda con fecha de hoy; el conductor la ve en su celular y sigue registrando.</p>
      </div>
      {conductores.length > 1 && (
        <label className="flex flex-col gap-1 text-sm">
          Conductor
          <select className="h-10 neu-campo px-3 text-sm" value={conductorId} onChange={(e) => setConductorId(e.target.value)}>
            <option value="">Elegir…</option>
            {conductores.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </label>
      )}
      {conductores.length === 1 && <span className="text-sm text-texto-suave">Conductor: {conductores[0].nombre}</span>}
      {conductores.length === 0 ? (
        <p className="text-sm text-aviso">No hay conductores activos.</p>
      ) : (
        <button type="submit" className="h-10 neu-boton-marca px-4 text-sm" disabled={pendiente}>
          {pendiente ? "Iniciando…" : "Iniciar vuelta"}
        </button>
      )}
      {error && <p role="alert" className="w-full text-sm text-perdida">{error}</p>}
    </form>
  );
}
