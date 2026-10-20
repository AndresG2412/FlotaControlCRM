"use client";

import { useState, useTransition } from "react";
import { cambiarEstadoCategoria, crearCategoria } from "@/app/admin/repuestos/acciones";
import type { Categoria } from "@/lib/dominio/repuestos";

// Diseño provisional: la presentación final la define la sección de diseño.
const campo = "h-10 flex-1 rounded-xl border border-borde bg-superficie px-3 text-sm";
const boton = "h-10 rounded-xl bg-marca px-4 text-sm font-semibold text-marca-texto disabled:opacity-60";

export function ControlesCategorias({ categorias }: { categorias: Categoria[] }) {
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const ejecutar = (accion: () => Promise<{ error: string | null }>, alTerminar?: () => void) =>
    iniciar(async () => {
      setError(null);
      const r = await accion().catch(() => ({ error: "No se pudo completar. Revisa la conexión." }));
      if (r.error) setError(r.error);
      else alTerminar?.();
    });

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ejecutar(() => crearCategoria({ nombre }), () => setNombre(""));
        }}
      >
        <input className={campo} value={nombre} maxLength={60} required onChange={(e) => setNombre(e.target.value)} placeholder="Nueva categoría" />
        <button className={boton} disabled={pendiente}>Agregar</button>
      </form>
      {error && <p role="alert" className="text-sm text-perdida">{error}</p>}
      <ul className="flex flex-col gap-2">
        {categorias.map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded-xl border border-borde bg-superficie px-4 py-2">
            <span className={c.activa ? "" : "text-texto-suave line-through"}>{c.nombre}</span>
            <button
              className="text-sm text-marca underline disabled:opacity-60"
              disabled={pendiente}
              onClick={() => ejecutar(() => cambiarEstadoCategoria({ id: c.id, activa: !c.activa }))}
            >
              {c.activa ? "Desactivar" : "Activar"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
