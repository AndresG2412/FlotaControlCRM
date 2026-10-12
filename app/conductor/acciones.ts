"use server";

import { exigirRol } from "@/lib/auth/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { esquemaUnirseAVuelta } from "@/lib/validaciones/registros";

/** Unirse a la vuelta en curso (o reemplazar a un compañero). Necesita señal. */
export async function unirseAVuelta(entrada: { vuelta_id: string; puesto: "florencia" | "pitalito" }) {
  await exigirRol("conductor");
  const datos = esquemaUnirseAVuelta.safeParse(entrada);
  if (!datos.success) return { error: "Datos inválidos" };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("unirse_a_vuelta", {
    p_vuelta: datos.data.vuelta_id,
    p_puesto: datos.data.puesto,
  });
  if (error) return { error: "No se pudo unir a la vuelta. ¿Ya terminó?" };
  return { error: null };
}
