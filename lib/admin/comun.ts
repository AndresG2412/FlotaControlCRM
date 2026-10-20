import "server-only";
import { crearClienteServidor } from "@/lib/supabase/servidor";

// Utilidades compartidas por las lecturas del panel del admin. Quien las llama ya
// verificó exigirRol("admin").

export type Cliente = Awaited<ReturnType<typeof crearClienteServidor>>;

/** Las URLs firmadas de fotos vencen pronto; recargar la página genera otras. */
const SEGUNDOS_URL_FOTO = 10 * 60;

/** Nombre de cada usuario por id (perfiles). */
export async function nombres(supabase: Cliente): Promise<Map<string, string>> {
  const { data, error } = await supabase.from("perfiles").select("id, nombre");
  if (error) throw new Error("No se pudieron leer los usuarios");
  return new Map(data.map((p) => [p.id, p.nombre]));
}

export const nombreDe = (mapa: Map<string, string>, id: string | null) =>
  id ? (mapa.get(id) ?? "Usuario desconocido") : null;

/**
 * URLs firmadas de corta duración (bucket privado evidencias). Se generan con la
 * sesión del admin: la política del bucket le deja leer todas las fotos.
 */
export async function urlsDeFotos(supabase: Cliente, rutas: string[]): Promise<Map<string, string>> {
  if (rutas.length === 0) return new Map();
  const { data, error } = await supabase.storage.from("evidencias").createSignedUrls(rutas, SEGUNDOS_URL_FOTO);
  if (error || !data) return new Map();
  return new Map(data.flatMap((f) => (f.path && f.signedUrl && !f.error ? [[f.path, f.signedUrl] as const] : [])));
}
