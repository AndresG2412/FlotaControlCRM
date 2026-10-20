import "server-only";
import { exigirRol } from "@/lib/auth/sesion";
import type { GastoFijoConfig } from "@/lib/dominio/gastos-fijos";
import { crearClienteServidor } from "@/lib/supabase/servidor";

// Lectura de la configuración de gastos fijos (solo admin; la RLS también lo exige).

/** Toda la configuración, con su historial de cambios. */
export async function listarConfigGastosFijos(): Promise<GastoFijoConfig[]> {
  await exigirRol("admin");
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("gastos_fijos_config")
    .select("concepto, valor, se_paga_en_ruta, vigente_desde")
    .order("concepto")
    .order("vigente_desde", { ascending: false });
  if (error) throw new Error("No se pudo leer la configuración de gastos fijos");
  return data;
}
