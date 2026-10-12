// Días calendario en America/Bogota. Una fecha es un texto "YYYY-MM-DD" (como el
// tipo date de Postgres); los instantes se guardan como timestamptz.

export type FechaISO = string;

export const ZONA_HORARIA = "America/Bogota";

const formatoDia = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_HORARIA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Día en Bogotá de un instante. */
export function diaEnBogota(instante: Date): FechaISO {
  return formatoDia.format(instante);
}

export function hoyEnBogota(ahora: Date = new Date()): FechaISO {
  return diaEnBogota(ahora);
}

/** Suma días a una fecha calendario (sin horas, sin zona). */
export function sumarDias(fecha: FechaISO, dias: number): FechaISO {
  const [a, m, d] = fecha.split("-").map(Number);
  const utc = new Date(Date.UTC(a, m - 1, d + dias));
  return utc.toISOString().slice(0, 10);
}

/** Días entre dos fechas calendario (b − a). */
export function diasEntre(a: FechaISO, b: FechaISO): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** Todas las fechas de un mes "YYYY-MM". */
export function diasDelMes(mes: string): FechaISO[] {
  const [a, m] = mes.split("-").map(Number);
  const total = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return Array.from({ length: total }, (_, i) => `${mes}-${String(i + 1).padStart(2, "0")}`);
}

/**
 * Un registro hecho sin señal guarda la hora del celular (ocurrido_en). Se marca
 * para revisión si está en el futuro o si llegó al servidor demasiado tarde.
 */
export function horaSospechosa(
  ocurridoEn: Date,
  sincronizadoEn: Date,
  { toleranciaFuturoMin = 10, maxDiasRetraso = 7 } = {},
): boolean {
  const adelanto = ocurridoEn.getTime() - sincronizadoEn.getTime();
  if (adelanto > toleranciaFuturoMin * 60_000) return true;
  return -adelanto > maxDiasRetraso * 86_400_000;
}

/** Primer y último día de un mes "YYYY-MM" (para filtrar columnas date). */
export function rangoDelMes(mes: string): { desde: FechaISO; hasta: FechaISO } {
  const dias = diasDelMes(mes);
  return { desde: dias[0], hasta: dias[dias.length - 1] };
}

const formatoFechaHora = new Intl.DateTimeFormat("es-CO", {
  timeZone: ZONA_HORARIA,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** Un instante (timestamptz) como fecha y hora de Bogotá, para mostrar. */
export function formatearFechaHora(instante: string | Date): string {
  return formatoFechaHora.format(typeof instante === "string" ? new Date(instante) : instante);
}
