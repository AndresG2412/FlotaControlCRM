// Recordatorios de pagos por correo (cron diario). La lógica recibe sus
// dependencias (leer pagos, enviar correo, marcar enviados) para poder probarla.

import { armarCorreoRecordatorio, porRecordar, type PagoBase } from "@/lib/dominio/vencimientos";

export type Correo = { asunto: string; texto: string; html: string };

export type DependenciasRecordatorio = {
  hoy: string;
  leerPagosActivos: () => Promise<PagoBase[]>;
  enviarCorreo: (correo: Correo) => Promise<void>;
  marcarEnviados: (ids: string[]) => Promise<void>;
};

/**
 * Envía un solo correo con todo lo que toca renovar y marca esos pagos como
 * avisados. Si el correo falla no se marca nada: mañana se reintenta.
 */
export async function procesarRecordatorios(d: DependenciasRecordatorio): Promise<{ enviados: number }> {
  const pendientes = porRecordar(await d.leerPagosActivos(), d.hoy);
  if (pendientes.length === 0) return { enviados: 0 };
  await d.enviarCorreo(armarCorreoRecordatorio(pendientes, d.hoy));
  await d.marcarEnviados(pendientes.map((p) => p.id));
  return { enviados: pendientes.length };
}
