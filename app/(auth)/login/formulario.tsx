"use client";

import { useActionState } from "react";
import { iniciarSesion, type EstadoLogin } from "@/lib/auth/acciones";

const inicial: EstadoLogin = { error: null, usuario: "" };

export function FormularioLogin() {
  const [estado, accion, enviando] = useActionState(iniciarSesion, inicial);

  return (
    <form action={accion} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Usuario</span>
        <input
          name="usuario"
          defaultValue={estado.usuario}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          required
          className="h-12 rounded-xl border border-borde bg-superficie px-4 text-base outline-none focus:border-marca focus:ring-2 focus:ring-marca/30"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Contraseña</span>
        <input
          name="contrasena"
          type="password"
          autoComplete="current-password"
          required
          className="h-12 rounded-xl border border-borde bg-superficie px-4 text-base outline-none focus:border-marca focus:ring-2 focus:ring-marca/30"
        />
      </label>
      {estado.error && (
        <p role="alert" className="rounded-lg bg-perdida/10 px-3 py-2 text-sm text-perdida">
          {estado.error}
        </p>
      )}
      <button
        type="submit"
        disabled={enviando}
        className="h-12 rounded-xl bg-marca text-base font-semibold text-marca-texto transition active:scale-[0.98] disabled:opacity-60"
      >
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
