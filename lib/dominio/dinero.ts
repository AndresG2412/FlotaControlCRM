// Montos en pesos colombianos como enteros. Nunca decimales.

export type Pesos = number;

const formato = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatearPesos(monto: Pesos): string {
  return formato.format(monto);
}

export function esMontoValido(monto: number): monto is Pesos {
  return Number.isSafeInteger(monto) && monto >= 0;
}

/**
 * Convierte lo que se digita en un campo ("80.000", "$ 80000", "80000") a entero.
 * Devuelve null si no es un monto entero válido.
 */
export function leerPesos(texto: string): Pesos | null {
  const limpio = texto.replace(/[\s$.]/g, "");
  if (!/^\d+$/.test(limpio)) return null;
  const monto = Number(limpio);
  return esMontoValido(monto) ? monto : null;
}

export function sumar(montos: readonly Pesos[]): Pesos {
  return montos.reduce((total, m) => total + m, 0);
}
