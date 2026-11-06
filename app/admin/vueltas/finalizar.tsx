"use client";

import { useState, useTransition } from "react";
import { finalizarVuelta } from "./acciones";

/** Finalizar la vuelta en curso (botón rojo, pide confirmación). Se usa en la lista y en el detalle. */
export function FinalizarVuelta({ id }: { id: string }) {
  const [confirmar, setConfirmar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function finalizar() {
    setError(null);
    iniciar(async () => {
      try {
        const r = await finalizarVuelta({ id });
        if (r.error) setError(r.error);
        else setConfirmar(false);
      } catch {
        setError("No se pudo completar. Revisa la conexión e intenta de nuevo.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {confirmar ? (
        <div className="flex flex-col gap-2 neu-pozo neu-peligro p-3">
          <p className="text-sm">
            ¿Finalizar la vuelta? Deja de estar en curso y ya se puede iniciar otra. Después la puedes cerrar con el
            cuadre, o reabrirla si fue un error.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="h-10 neu-boton px-4 text-sm" onClick={() => setConfirmar(false)}>Cancelar</button>
            <button type="button" className="h-10 neu-boton-peligro px-4 text-sm" disabled={pendiente} onClick={finalizar}>
              {pendiente ? "Finalizando…" : "Sí, finalizar"}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="h-10 w-fit neu-boton-peligro px-4 text-sm" onClick={() => setConfirmar(true)}>
          Finalizar vuelta
        </button>
      )}
      {error && <p role="alert" className="text-sm text-perdida">{error}</p>}
    </div>
  );
}
