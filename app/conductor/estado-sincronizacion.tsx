"use client";

import { liveQuery } from "dexie";
import { useEffect, useState } from "react";
import { iniciarSincronizacion, recordarUsuario } from "@/lib/offline/ciclo";
import { resumenCola } from "@/lib/offline/cola";
import { baseLocal } from "@/lib/offline/db";
import { AJUSTE_SESION_VENCIDA } from "@/lib/offline/enviar";

type Estado = { pendientes: number; errores: number; fotos: number; sesionVencida: boolean };

/**
 * Arranca la sincronización y muestra siempre qué falta por enviar (regla offline).
 * Solo cuenta registros: nunca muestra montos ni totales de dinero.
 * Diseño provisional: la presentación final la define la sección de diseño.
 */
export function EstadoSincronizacion({ uid }: { uid: string }) {
  const [estado, setEstado] = useState<Estado | null>(null);

  useEffect(() => {
    void recordarUsuario(uid);
    const detener = iniciarSincronizacion();
    const db = baseLocal();
    const suscripcion = liveQuery(async () => ({
      ...(await resumenCola(db)),
      sesionVencida: Boolean((await db.ajustes.get(AJUSTE_SESION_VENCIDA))?.valor),
    })).subscribe({ next: setEstado, error: () => undefined });
    return () => {
      detener();
      suscripcion.unsubscribe();
    };
  }, [uid]);

  if (!estado) return null;
  const { pendientes, errores, fotos, sesionVencida } = estado;

  let texto = "Todo enviado";
  let punto = "bg-ganancia";
  if (sesionVencida) [texto, punto] = ["Sesión vencida: vuelve a entrar para enviar lo guardado", "bg-perdida"];
  else if (errores > 0) [texto, punto] = [`${errores} registro(s) con error`, "bg-perdida"];
  else if (pendientes + fotos > 0) [texto, punto] = [`${pendientes + fotos} por enviar`, "bg-aviso"];

  return (
    <p role="status" className="flex items-center gap-1.5 truncate text-xs text-texto-suave">
      <span className={`size-1.5 shrink-0 rounded-full ${punto}`} aria-hidden />
      {texto}
    </p>
  );
}
