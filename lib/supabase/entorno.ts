// Variables públicas de Supabase. Acceso literal a process.env para que Next las
// incruste en el bundle del cliente.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const llavePublica = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !llavePublica) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ver .env.example)",
  );
}

export const SUPABASE_URL = url;
export const SUPABASE_LLAVE_PUBLICA = llavePublica;
