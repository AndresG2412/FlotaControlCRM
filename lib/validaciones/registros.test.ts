import { describe, expect, it } from "vitest";
import { esquemaGastoVariable, esquemaPlanilla, esquemaPolilla } from "./registros";

const id = "6f1c1b7e-2a4d-4b8a-9c3e-1d2f3a4b5c6d";
const trayecto_id = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const ocurrido_en = "2026-10-12T14:30:00-05:00";

describe("validaciones", () => {
  it("planilla: Cali no emite planilla en la ida", () => {
    const r = esquemaPlanilla.safeParse({
      id, ocurrido_en, trayecto_id, sentido: "ida", terminal: "cali", emitida: true, neto: 100000,
    });
    expect(r.success).toBe(false);
  });

  it("planilla sin emitir exige motivo", () => {
    const base = { id, ocurrido_en, trayecto_id, sentido: "ida", terminal: "popayan", emitida: false };
    expect(esquemaPlanilla.safeParse(base).success).toBe(false);
    expect(esquemaPlanilla.safeParse({ ...base, motivo_sin_planilla: "Terminal cerrada" }).success).toBe(true);
  });

  it("polilla: el ejemplo del dueño es válido", () => {
    const r = esquemaPolilla.safeParse({
      id, ocurrido_en, trayecto_id, tramo_id: "ida-1", destino: "cali", monto_cobrado: 80000,
      facturado: true, terminal_facturacion: "pitalito", monto_facturado: 55000, destino_sobrante: "polilla",
    });
    expect(r.success).toBe(true);
  });

  it("polilla: rechaza decimales y destinos hacia atrás", () => {
    const base = {
      id, ocurrido_en, trayecto_id, tramo_id: "ida-2", destino: "cali", monto_cobrado: 80000,
      facturado: false, monto_facturado: 0, destino_sobrante: "polilla",
    };
    expect(esquemaPolilla.safeParse(base).success).toBe(true);
    expect(esquemaPolilla.safeParse({ ...base, monto_cobrado: 80000.5 }).success).toBe(false);
    expect(esquemaPolilla.safeParse({ ...base, destino: "florencia" }).success).toBe(false);
  });

  it("gasto: una liga necesita terminal", () => {
    const base = { id, ocurrido_en, vuelta_id: trayecto_id, tipo: "liga", monto: 20000 };
    expect(esquemaGastoVariable.safeParse(base).success).toBe(false);
    expect(esquemaGastoVariable.safeParse({ ...base, terminal: "pitalito" }).success).toBe(true);
  });
});
