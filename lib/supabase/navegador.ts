import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_LLAVE_PUBLICA, SUPABASE_URL } from "./entorno";
import type { Database } from "./tipos";

let cliente: ReturnType<typeof createBrowserClient<Database>> | undefined;

/**
 * Cliente de Supabase para el navegador (un solo cliente por pestaña).
 * Lo usa la capa offline para subir fotos a Storage; las escrituras de datos
 * van por el endpoint de sincronización, que valida con Zod.
 */
export function clienteNavegador() {
  cliente ??= createBrowserClient<Database>(SUPABASE_URL, SUPABASE_LLAVE_PUBLICA);
  return cliente;
}
