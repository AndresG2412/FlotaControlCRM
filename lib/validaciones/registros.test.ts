import { describe, expect, it } from "vitest";
import { esquemaEncomienda, esquemaGastoVariable, esquemaPlanilla, esquemaPolilla } from "./registros";

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
      id, ocurrido_en, trayecto_id, sentido: "ida", tramo_id: "ida-1", destino: "cali", monto_cobrado: 80000,
      facturado: true, terminal_facturacion: "pitalito", monto_facturado: 55000, destino_sobrante: "polilla",
    });
    expect(r.success).toBe(true);
  });

  it("polilla: rechaza decimales, destinos hacia atrás y tramos de otro sentido", () => {
    const base = {
      id, ocurrido_en, trayecto_id, sentido: "ida", tramo_id: "ida-3", destino: "cali", monto_cobrado: 30000,
      facturado: false, monto_facturado: 0, destino_sobrante: "polilla",
    };
    expect(esquemaPolilla.safeParse(base).success).toBe(true);
    expect(esquemaPolilla.safeParse({ ...base, monto_cobrado: 30000.5 }).success).toBe(false);
    expect(esquemaPolilla.safeParse({ ...base, destino: "florencia" }).success).toBe(false);
    expect(esquemaPolilla.safeParse({ ...base, sentido: "regreso" }).success).toBe(false);
  });

  it("polilla: si pasa una terminal se factura allí, y nunca más de lo cobrado", () => {
    const base = {
      id, ocurrido_en, trayecto_id, sentido: "ida", tramo_id: "ida-2", destino: "cali", monto_cobrado: 50000,
      facturado: true, terminal_facturacion: "popayan", monto_facturado: 30000, destino_sobrante: "polilla",
    };
    expect(esquemaPolilla.safeParse(base).success).toBe(true);
    // No facturarlo no se permite.
    expect(esquemaPolilla.safeParse({ ...base, facturado: false, terminal_facturacion: null, monto_facturado: 0 }).success).toBe(false);
    // Otra terminal o sin monto, tampoco.
    expect(esquemaPolilla.safeParse({ ...base, terminal_facturacion: "pitalito" }).success).toBe(false);
    expect(esquemaPolilla.safeParse({ ...base, monto_facturado: 0 }).success).toBe(false);
    // El tiquete se hace por lo que pagó: nunca sobrante negativo.
    expect(esquemaPolilla.safeParse({ ...base, monto_facturado: 55000 }).success).toBe(false);
  });

  it("polilla: si se baja en la siguiente terminal no se factura", () => {
    const base = {
      id, ocurrido_en, trayecto_id, sentido: "ida", tramo_id: "ida-1", destino: "pitalito", monto_cobrado: 20000,
      facturado: false, monto_facturado: 0, destino_sobrante: "conductor",
    };
    expect(esquemaPolilla.safeParse(base).success).toBe(true);
    expect(esquemaPolilla.safeParse({ ...base, facturado: true, terminal_facturacion: "pitalito", monto_facturado: 5000 }).success).toBe(false);
  });

  it("encomienda: el destino va hacia adelante desde donde se recibió", () => {
    const base = { id, ocurrido_en, trayecto_id, sentido: "ida", destino: "cali", monto: 15000 };
    expect(esquemaEncomienda.safeParse({ ...base, recibida_en_terminal: "florencia" }).success).toBe(true);
    expect(esquemaEncomienda.safeParse({ ...base, recibida_en_tramo: "ida-2" }).success).toBe(true);
    expect(esquemaEncomienda.safeParse({ ...base, recibida_en_terminal: "florencia", destino: "florencia" }).success).toBe(false);
    expect(esquemaEncomienda.safeParse({ ...base, recibida_en_tramo: "regreso-1" }).success).toBe(false);
    expect(esquemaEncomienda.safeParse(base).success).toBe(false); // falta dónde se recibió
    expect(
      esquemaEncomienda.safeParse({ ...base, recibida_en_terminal: "florencia", recibida_en_tramo: "ida-1" }).success,
    ).toBe(false);
  });

  it("gasto: una liga necesita terminal", () => {
    const base = { id, ocurrido_en, vuelta_id: trayecto_id, tipo: "liga", monto: 20000 };
    expect(esquemaGastoVariable.safeParse(base).success).toBe(false);
    expect(esquemaGastoVariable.safeParse({ ...base, terminal: "pitalito" }).success).toBe(true);
  });
});
