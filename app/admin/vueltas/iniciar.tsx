"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { iniciarVueltaAdmin } from "./acciones";
import { FinalizarVuelta } from "./finalizar";

// Diseño provisional: la presentación final la define la sección de diseño.

/** El admin inicia la vuelta de hoy con un solo botón. Solo una en curso. */
export function IniciarVuelta({ enCurso }: { enCurso: { id: string; fecha: string } | null }) {
  const router = useRouter();
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
    setError(null);
    iniciar(async () => {
      try {
        const r = await iniciarVueltaAdmin();
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
        <p className="text-xs text-texto-suave">Queda con fecha de hoy.</p>
      </div>
      <button type="submit" className="h-10 neu-boton-marca px-4 text-sm" disabled={pendiente}>
        {pendiente ? "Iniciando…" : "Iniciar vuelta"}
      </button>
      {error && <p role="alert" className="w-full text-sm text-perdida">{error}</p>}
    </form>
  );
}
