// Pagos y vencimientos de la buseta (CLAUDE.md, Módulo 6): SOAT, seguro,
// tecnomecánica, cuota a la empresa… Al renovar se registra un pago nuevo; el
// vigente de cada concepto es el último pago. Puro, con tests.

import { formatearPesos, type Pesos } from "./dinero";
import { diasEntre, type FechaISO } from "./fechas";

export type PagoBase = {
  id: string;
  nombre: string;
  fecha_pago: FechaISO;
  costo: Pesos;
  fecha_recordatorio: FechaISO | null;
  fecha_vencimiento: FechaISO | null;
  recordatorio_enviado_en: string | null;
  creado_en: string;
};

/** Días antes del vencimiento en que se considera "por vencer". */
export const DIAS_POR_VENCER = 30;

export type EstadoVencimiento = "vencido" | "recordar" | "por_vencer" | "al_dia" | "sin_vencimiento";

const clave = (nombre: string) => nombre.trim().toLowerCase();

/** Último pago de cada concepto (el vigente). Más próximos a vencer primero. */
export function vigentes<P extends PagoBase>(pagos: readonly P[]): P[] {
  const ultimo = new Map<string, P>();
  for (const p of pagos) {
    const previo = ultimo.get(clave(p.nombre));
    if (!previo || p.fecha_pago > previo.fecha_pago || (p.fecha_pago === previo.fecha_pago && p.creado_en > previo.creado_en)) {
      ultimo.set(clave(p.nombre), p);
    }
  }
  return [...ultimo.values()].sort((a, b) =>
    (a.fecha_vencimiento ?? "9999").localeCompare(b.fecha_vencimiento ?? "9999") || a.nombre.localeCompare(b.nombre),
  );
}

export function estadoVencimiento(p: Pick<PagoBase, "fecha_recordatorio" | "fecha_vencimiento">, hoy: FechaISO): EstadoVencimiento {
  if (p.fecha_vencimiento && p.fecha_vencimiento < hoy) return "vencido";
  if (p.fecha_recordatorio && p.fecha_recordatorio <= hoy) return "recordar";
  if (p.fecha_vencimiento && diasEntre(hoy, p.fecha_vencimiento) <= DIAS_POR_VENCER) return "por_vencer";
  return p.fecha_vencimiento ? "al_dia" : "sin_vencimiento";
}

export const ETIQUETA_VENCIMIENTO: Record<EstadoVencimiento, string> = {
  vencido: "Vencido",
  recordar: "Toca renovar",
  por_vencer: "Por vencer",
  al_dia: "Al día",
  sin_vencimiento: "Sin vencimiento",
};

/**
 * Pagos vigentes a los que ya les llegó la fecha de recordatorio y aún no se
 * avisó por correo. Si ya se renovó (hay un pago más nuevo), no se avisa.
 */
export function porRecordar<P extends PagoBase>(pagos: readonly P[], hoy: FechaISO): P[] {
  return vigentes(pagos).filter(
    (p) => p.fecha_recordatorio !== null && p.fecha_recordatorio <= hoy && p.recordatorio_enviado_en === null,
  );
}

const escapar = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Correo de recordatorio para el dueño (texto y HTML con los datos escapados). */
export function armarCorreoRecordatorio(
  pagos: readonly Pick<PagoBase, "nombre" | "costo" | "fecha_vencimiento">[],
  hoy: FechaISO,
): { asunto: string; texto: string; html: string } {
  const linea = (p: (typeof pagos)[number]) => {
    const vence = p.fecha_vencimiento
      ? (() => {
          const d = diasEntre(hoy, p.fecha_vencimiento);
          return d < 0 ? `venció hace ${-d} días (${p.fecha_vencimiento})` : d === 0 ? "vence hoy" : `vence en ${d} días (${p.fecha_vencimiento})`;
        })()
      : "sin fecha de vencimiento";
    return { nombre: p.nombre, detalle: `${vence} · último pago ${formatearPesos(p.costo)}` };
  };
  const lineas = pagos.map(linea);
  const asunto =
    pagos.length === 1 ? `Recordatorio: ${pagos[0].nombre}` : `Recordatorio: ${pagos.length} pagos de la buseta por renovar`;
  const texto = ["Pagos de la buseta por renovar:", "", ...lineas.map((l) => `- ${l.nombre}: ${l.detalle}`), "", "FlotaControl"].join("\n");
  const html = [
    "<p>Pagos de la buseta por renovar:</p>",
    "<ul>",
    ...lineas.map((l) => `<li><strong>${escapar(l.nombre)}</strong>: ${escapar(l.detalle)}</li>`),
    "</ul>",
    "<p>Entra al panel de FlotaControl para registrar la renovación.</p>",
  ].join("");
  return { asunto: asunto.slice(0, 150), texto, html };
}
