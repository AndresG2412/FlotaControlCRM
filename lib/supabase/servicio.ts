import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./entorno";
import type { Database } from "./tipos";

/**
 * Cliente con la llave secreta: OMITE la RLS. Solo para procesos del servidor sin
 * usuario (el cron de recordatorios), y siempre después de verificar quién llama.
 * Nunca importarlo desde código de cliente ni usarlo para atender a un usuario.
 */
export function clienteServicio() {
  const llave = process.env.SUPABASE_SECRET_KEY;
  if (!llave) throw new Error("Falta SUPABASE_SECRET_KEY (solo servidor)");
  return createClient<Database>(SUPABASE_URL, llave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
