import type { BaseLocal } from "./db";
import type { Enviar } from "./cola";
import type { ResultadoOperacion } from "./operaciones";

export const AJUSTE_SESION_VENCIDA = "sesionVencida";

/**
 * Envía un lote al endpoint de sincronización. Cualquier fallo de red o del
 * servidor lanza: la cola deja todo pendiente y reintenta después.
 */
export function crearEnviador(db: BaseLocal): Enviar {
  return async (lote) => {
    const respuesta = await fetch("/api/sincronizar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(lote),
    });
    if (respuesta.status === 401) {
      // Lo registrado sigue guardado; la interfaz pide volver a entrar.
      await db.ajustes.put({ clave: AJUSTE_SESION_VENCIDA, valor: true });
      throw new Error("Sesión vencida");
    }
    if (!respuesta.ok) throw new Error(`Sincronización falló: ${respuesta.status}`);
    await db.ajustes.delete(AJUSTE_SESION_VENCIDA);
    const cuerpo = (await respuesta.json()) as { resultados: ResultadoOperacion[] };
    return cuerpo.resultados;
  };
}
