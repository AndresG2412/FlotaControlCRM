// Ciclo automático de sincronización en el navegador: al abrir la app, al volver
// la señal, al volver a la pestaña y cada minuto. Primero las fotos, luego los datos.

import { clienteNavegador } from "@/lib/supabase/navegador";
import { sincronizar } from "./cola";
import { baseLocal } from "./db";
import { descargar } from "./descargar";
import { crearEnviador } from "./enviar";
import { subirFotos, type Subir } from "./fotos";

const INTERVALO_MS = 60_000;

const subirAStorage: Subir = async (ruta, blob) => {
  const { error } = await clienteNavegador().storage.from("evidencias").upload(ruta, blob, {
    contentType: blob.type || "image/webp",
    upsert: false,
  });
  if (error && !/exists|duplicate/i.test(error.message)) throw new Error(error.message);
};

export async function sincronizarAhora() {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  const db = baseLocal();
  const fotos = await subirFotos(db, subirAStorage);
  if (fotos.sinConexion) return;
  const envio = await sincronizar(db, crearEnviador(db));
  if (envio.sinConexion) return;
  // Después de enviar, se trae lo del compañero y los cambios del admin.
  await descargar(db, clienteNavegador());
}

/** Arranca el ciclo; devuelve la función para detenerlo. */
export function iniciarSincronizacion(): () => void {
  const correr = () => void sincronizarAhora().catch(() => undefined);
  const alVolver = () => {
    if (document.visibilityState === "visible") correr();
  };
  correr();
  const intervalo = setInterval(correr, INTERVALO_MS);
  window.addEventListener("online", correr);
  document.addEventListener("visibilitychange", alVolver);
  return () => {
    clearInterval(intervalo);
    window.removeEventListener("online", correr);
    document.removeEventListener("visibilitychange", alVolver);
  };
}

export const AJUSTE_UID = "uid";

/** Guarda el uid de la sesión para nombrar fotos sin señal. */
export async function recordarUsuario(uid: string) {
  await baseLocal().ajustes.put({ clave: AJUSTE_UID, valor: uid });
}
