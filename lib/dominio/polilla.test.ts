import { describe, expect, it } from "vitest";
import { destinosDeEncomienda, repartoPasajero, sobrante, terminalDeFacturacion, tramoActual } from "./polilla";

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

  it("se factura en la primera terminal que pasa sin bajarse", () => {
    expect(terminalDeFacturacion("ida-1", "cali")).toBe("pitalito");
    expect(terminalDeFacturacion("ida-2", "cali")).toBe("popayan");
    expect(terminalDeFacturacion("ida-1", "pitalito")).toBeNull();
    expect(terminalDeFacturacion("regreso-1", "florencia")).toBe("popayan");
  });

  it("el tramo actual sale de la última terminal registrada", () => {
    expect(tramoActual("ida", []).id).toBe("ida-1");
    expect(tramoActual("ida", ["florencia"]).id).toBe("ida-1");
    expect(tramoActual("ida", ["florencia", "pitalito"]).id).toBe("ida-2");
    expect(tramoActual("regreso", ["cali", "popayan", "pitalito"]).id).toBe("regreso-3");
  });

  it("una encomienda va siempre hacia adelante", () => {
    expect(destinosDeEncomienda("ida", { terminal: "florencia" })).toEqual(["pitalito", "popayan", "cali"]);
    expect(destinosDeEncomienda("ida", { terminal: "popayan" })).toEqual(["cali"]);
    expect(destinosDeEncomienda("ida", { terminal: "cali" })).toEqual([]);
    expect(destinosDeEncomienda("ida", { tramo: "ida-2" })).toEqual(["popayan", "cali"]);
    expect(destinosDeEncomienda("ida", { tramo: "regreso-1" })).toEqual([]);
    expect(destinosDeEncomienda("regreso", { terminal: "cali" })).toEqual(["popayan", "pitalito", "florencia"]);
  });
});
