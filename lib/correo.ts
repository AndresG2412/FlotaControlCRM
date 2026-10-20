import "server-only";
import type { Correo } from "./recordatorios";

/** Envía un correo al dueño con Resend (API REST). Lanza si falla. */
export async function enviarCorreoAlDueno(correo: Correo): Promise<void> {
  const llave = process.env.RESEND_API_KEY;
  const de = process.env.RESEND_FROM;
  const para = process.env.ALERTAS_CORREO;
  if (!llave || !de || !para) throw new Error("Faltan RESEND_API_KEY, RESEND_FROM o ALERTAS_CORREO");

  const respuesta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${llave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: de, to: [para], subject: correo.asunto, text: correo.texto, html: correo.html }),
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  // No se registra el cuerpo de la respuesta: puede traer datos del destinatario.
  if (!respuesta.ok) throw new Error(`Resend respondió ${respuesta.status}`);
}
