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
          className="h-12 neu-campo px-4 text-base"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Contraseña</span>
        <input
          name="contrasena"
          type="password"
          autoComplete="current-password"
          required
          className="h-12 neu-campo px-4 text-base"
        />
      </label>
      {estado.error && (
        <p role="alert" className="neu-pozo neu-peligro px-4 py-3 text-sm text-perdida">
          {estado.error}
        </p>
      )}
      <button
        type="submit"
        disabled={enviando}
        className="mt-1 h-12 neu-boton-marca text-base"
      >
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
