import { describe, expect, it } from "vitest";
import { repartoPasajero, sobrante, sugerirFacturacion, tarifaVigente, type Tarifa } from "./polilla";

const tarifas: Tarifa[] = [
  { origen: "pitalito", destino: "cali", precio: 50000, vigenteDesde: "2026-01-01" },
  { origen: "pitalito", destino: "cali", precio: 55000, vigenteDesde: "2026-09-01" },
  { origen: "pitalito", destino: "cali", precio: 60000, vigenteDesde: "2027-01-01" },
];

describe("polilla", () => {
  it("ejemplo del dueño: cobra 80.000, factura 55.000 en Pitalito, sobran 25.000", () => {
    const p = { montoCobrado: 80000, montoFacturado: 55000 };
    expect(sobrante(p)).toBe(25000);
    expect(repartoPasajero({ ...p, destinoSobrante: "polilla" })).toEqual({
      polilla: 25000,
      quedoConductor: 0,
    });
    expect(repartoPasajero({ ...p, destinoSobrante: "conductor" })).toEqual({
      polilla: 0,
      quedoConductor: 25000,
    });
  });

  it("si se bajó antes de la terminal, todo es sobrante", () => {
    expect(sobrante({ montoCobrado: 20000, montoFacturado: 0 })).toBe(20000);
  });

  it("usa la tarifa vigente en la fecha, no una futura", () => {
    expect(tarifaVigente(tarifas, "pitalito", "cali", "2026-10-12")?.precio).toBe(55000);
    expect(tarifaVigente(tarifas, "pitalito", "cali", "2026-05-01")?.precio).toBe(50000);
    expect(tarifaVigente(tarifas, "pitalito", "cali", "2025-12-31")).toBeUndefined();
  });

  it("sugiere dónde facturar y cuánto", () => {
    expect(sugerirFacturacion(tarifas, "ida-1", "cali", "2026-10-12")).toEqual({
      terminal: "pitalito",
      monto: 55000,
    });
    expect(sugerirFacturacion(tarifas, "ida-1", "pitalito", "2026-10-12")).toBeNull();
    expect(sugerirFacturacion([], "ida-2", "cali", "2026-10-12")).toEqual({
      terminal: "popayan",
      monto: null,
    });
  });
});
