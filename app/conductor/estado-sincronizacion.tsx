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
  if (sesionVencida) texto = "Sesión vencida: vuelve a entrar para enviar lo guardado";
  else if (errores > 0) texto = `${errores} registro(s) con error`;
  else if (pendientes + fotos > 0) texto = `${pendientes + fotos} por enviar`;

  return (
    <p role="status" className="text-xs text-texto-suave">
      {texto}
    </p>
  );
}
