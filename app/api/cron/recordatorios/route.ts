import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { enviarCorreoAlDueno } from "@/lib/correo";
import { hoyEnBogota } from "@/lib/dominio/fechas";
import { procesarRecordatorios } from "@/lib/recordatorios";
import { clienteServicio } from "@/lib/supabase/servicio";

/**
 * Cron diario de Vercel (vercel.json): avisa por correo al dueño los pagos de la
 * buseta cuyo recordatorio ya llegó. Vercel envía `Authorization: Bearer
 * CRON_SECRET`; sin eso responde 401. Usa la llave secreta (sin usuario), así que
 * la verificación del secreto va primero y la respuesta no trae datos.
 */
function autorizado(peticion: Request): boolean {
  const secreto = process.env.CRON_SECRET;
  const recibido = peticion.headers.get("authorization") ?? "";
  if (!secreto) return false;
  const esperado = Buffer.from(`Bearer ${secreto}`);
  const dado = Buffer.from(recibido);
  return dado.length === esperado.length && timingSafeEqual(dado, esperado);
}

export async function GET(peticion: Request) {
  if (!autorizado(peticion)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const supabase = clienteServicio();
  try {
    const r = await procesarRecordatorios({
      hoy: hoyEnBogota(),
      leerPagosActivos: async () => {
        const { data, error } = await supabase
          .from("pagos_periodicos")
          .select("id, nombre, fecha_pago, costo, fecha_recordatorio, fecha_vencimiento, recordatorio_enviado_en, creado_en")
          .eq("estado", "activo");
        if (error) throw new Error("No se pudieron leer los pagos");
        return data;
      },
      enviarCorreo: enviarCorreoAlDueno,
      marcarEnviados: async (ids) => {
        const { error } = await supabase
          .from("pagos_periodicos")
          .update({ recordatorio_enviado_en: new Date().toISOString() })
          .in("id", ids);
        if (error) throw new Error("No se pudieron marcar los recordatorios");
      },
    });
    return NextResponse.json({ enviados: r.enviados });
  } catch {
    return NextResponse.json({ error: "No se pudo procesar; se reintenta mañana" }, { status: 502 });
  }
}
