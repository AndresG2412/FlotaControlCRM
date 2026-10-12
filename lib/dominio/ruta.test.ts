import { describe, expect, it } from "vitest";
import { destinosPosibles, terminalesConPlanilla, terminalesDeFacturacion } from "./ruta";

describe("ruta", () => {
  it("la terminal final nunca emite planilla", () => {
    expect(terminalesConPlanilla("ida")).toEqual(["florencia", "pitalito", "popayan"]);
    expect(terminalesConPlanilla("regreso")).toEqual(["cali", "popayan", "pitalito"]);
  });

  it("los destinos están más adelante en el mismo sentido", () => {
    expect(destinosPosibles("ida-2")).toEqual(["popayan", "cali"]);
    expect(destinosPosibles("regreso-3")).toEqual(["florencia"]);
    expect(destinosPosibles("no-existe")).toEqual([]);
  });

  it("se factura en las terminales que el pasajero pasó sin bajarse", () => {
    // Sube cerca de Florencia y va a Cali: pasa por Pitalito y Popayán.
    expect(terminalesDeFacturacion("ida-1", "cali")).toEqual(["pitalito", "popayan"]);
    // Se baja antes de la siguiente terminal: no se factura.
    expect(terminalesDeFacturacion("ida-1", "pitalito")).toEqual([]);
    // Destino que ya quedó atrás: inválido.
    expect(terminalesDeFacturacion("ida-3", "pitalito")).toEqual([]);
  });
});
