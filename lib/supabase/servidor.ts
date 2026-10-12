import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_LLAVE_PUBLICA, SUPABASE_URL } from "./entorno";
import type { Database } from "./tipos";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 * Actúa con la sesión del usuario: la RLS de Postgres decide qué puede ver y escribir.
 */
export async function crearClienteServidor() {
  const almacen = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_LLAVE_PUBLICA, {
    cookies: {
      getAll() {
        return almacen.getAll();
      },
      setAll(galletas) {
        try {
          for (const { name, value, options } of galletas) {
            almacen.set(name, value, options);
          }
        } catch {
          // Llamado desde un Server Component: no puede escribir cookies.
          // El proxy refresca la sesión en cada petición, así que se puede ignorar.
        }
      },
    },
  });
}
