"use server";

import { revalidatePath } from "next/cache";
import { exigirRol } from "@/lib/auth/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { esquemaGastoFijoConfig, type GastoFijoConfigEntrada } from "@/lib/validaciones/admin";

// Cambia el valor de un concepto desde una fecha, agrega uno nuevo o lo quita
// (valor 0). Las vueltas ya creadas conservan sus valores: solo cambian las que
// se creen desde esa fecha.

export type Resultado = { error: string | null };

export async function guardarGastoFijoConfig(entrada: GastoFijoConfigEntrada): Promise<Resultado> {
  await exigirRol("admin");
  const datos = esquemaGastoFijoConfig.safeParse(entrada);
  if (!datos.success) return { error: datos.error.issues[0]?.message ?? "Datos inválidos" };

  const supabase = await crearClienteServidor();
  // Un mismo concepto en la misma fecha se reemplaza (unique concepto + vigente_desde).
  const { error } = await supabase
    .from("gastos_fijos_config")
    .upsert(datos.data, { onConflict: "concepto,vigente_desde" });
  if (error) return { error: "No se pudo guardar el gasto fijo" };

  revalidatePath("/admin/configuracion/gastos-fijos");
  return { error: null };
}
